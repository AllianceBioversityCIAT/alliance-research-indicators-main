import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { ControlListRepository } from './repositories/control-list.repository';
import { ControlListValueRepository } from './repositories/control-list-value.repository';
import { CreateControlListCategoryDto } from './dto/create-control-list-category.dto';
import { UpdateControlListCategoryDto } from './dto/update-control-list-category.dto';
import { CreateControlListDto } from './dto/create-control-list.dto';
import { UpdateControlListDto } from './dto/update-control-list.dto';
import { CreateControlListValueDto } from './dto/create-control-list-value.dto';
import { UpdateControlListValueDto } from './dto/update-control-list-value.dto';
import { ControlListCategory } from './entities/control-list-category.entity';
import { ControlList } from './entities/control-list.entity';
import { ControlListValue } from './entities/control-list-value.entity';
import { PortfoliosService } from '../portfolios/portfolios.service';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import {
  ControlListCategoryResponse,
  ControlListResponse,
  ControlListValueResponse,
  ListSummary,
  PortfolioCategoriesSummary,
} from './control-lists.types';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ControlListUsageRegistry } from './control-list-usage.registry';
import { controlListNaturalCompare } from './control-list-natural-compare.util';

// MySQL "Duplicate entry" errno. TypeORM's QueryFailedError copies every
// driverError property (minus `name`) onto the thrown instance itself
// (typeorm/error/QueryFailedError.js), so `error.errno` is readable directly
// — no `.driverError` indirection needed.
const MYSQL_DUPLICATE_ENTRY_ERRNO = 1062;

@Injectable()
export class ControlListsService {
  private readonly logger = new LoggerUtil({ name: ControlListsService.name });

  constructor(
    private readonly categoryRepository: ControlListCategoryRepository,
    private readonly listRepository: ControlListRepository,
    private readonly valueRepository: ControlListValueRepository,
    private readonly portfoliosService: PortfoliosService,
    private readonly currentUser: CurrentUserUtil,
    private readonly usageRegistry: ControlListUsageRegistry,
  ) {}

  // ---------------------------------------------------------------------
  // A1 — GET /categories?portfolioId=
  // ---------------------------------------------------------------------
  async getCategories(
    portfolioId: number,
  ): Promise<ControlListCategoryResponse[]> {
    await this.assertPortfolioExists(portfolioId);

    const categories = await this.categoryRepository.find({
      where: { portfolio_id: portfolioId, is_active: true },
      order: { display_order: 'ASC', id: 'ASC' },
    });

    const lists = await this.listRepository.find({
      where: { portfolio_id: portfolioId, is_active: true },
      order: { id: 'ASC' },
    });

    // T-03: A1's valueCount now counts real rows per list (design §4 A1).
    // `usedBy` stays [] until the T-04 registry exists.
    const listsWithCounts = await Promise.all(
      lists.map(async (list) => ({
        list,
        valueCount: await this.valueRepository.count({
          where: { list_id: list.id },
        }),
      })),
    );

    return categories.map((category) =>
      this.mapCategory(
        category,
        listsWithCounts.filter(
          (entry) => entry.list.category_id === category.id,
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // A2 — GET /portfolios/summary
  // ---------------------------------------------------------------------
  async getPortfoliosSummary(): Promise<PortfolioCategoriesSummary[]> {
    const portfolios = await this.portfoliosService.findAll();

    return Promise.all(
      portfolios.map(async (portfolio) => ({
        portfolioId: portfolio.id,
        categories: await this.categoryRepository.count({
          where: { portfolio_id: portfolio.id, is_active: true },
        }),
      })),
    );
  }

  // ---------------------------------------------------------------------
  // A3 — POST /categories
  // ---------------------------------------------------------------------
  async createCategory(
    dto: CreateControlListCategoryDto,
  ): Promise<ControlListCategoryResponse> {
    await this.assertPortfolioExists(dto.portfolioId);
    await this.assertCategoryNameAvailable(dto.portfolioId, dto.name);

    const newCategory: Partial<ControlListCategory> = {
      portfolio_id: dto.portfolioId,
      name: dto.name,
      // Leader-adjudicated forward pointer (T-03 rework attempt 2):
      // normalizeDescription() also runs on CREATE, not only on update —
      // ''/whitespace/null all store NULL (same single representation of
      // "no description" as the PATCH path).
      description: this.normalizeDescription(dto.description),
      display_order: 0,
      ...this.currentUser.audit(SetAuditEnum.NEW),
    };

    let saved: ControlListCategory;
    try {
      saved = await this.categoryRepository.save(newCategory);
    } catch (error) {
      this.rethrowAsConflictIfDuplicate(error, dto.name);
    }

    this.logWrite(
      'created',
      'control_list_category',
      saved.id,
      saved.portfolio_id,
    );

    return this.mapCategory(saved);
  }

  // ---------------------------------------------------------------------
  // A4 — PATCH /categories/:id
  // ---------------------------------------------------------------------
  async updateCategory(
    id: number,
    dto: UpdateControlListCategoryDto,
  ): Promise<ControlListCategoryResponse> {
    const category = await this.findActiveCategoryOrFail(id);

    if (dto.name !== undefined && dto.name !== category.name) {
      await this.assertCategoryNameAvailable(
        category.portfolio_id,
        dto.name,
        id,
      );
    }

    const update: Partial<ControlListCategory> = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined
        ? { description: this.normalizeDescription(dto.description) }
        : {}),
      ...this.currentUser.audit(SetAuditEnum.UPDATE),
    };

    try {
      await this.categoryRepository.update(id, update);
    } catch (error) {
      this.rethrowAsConflictIfDuplicate(error, dto.name ?? category.name);
    }

    const updated = await this.categoryRepository.findOne({ where: { id } });

    this.logWrite(
      'updated',
      'control_list_category',
      id,
      category.portfolio_id,
    );

    return this.mapCategory(updated);
  }

  // ---------------------------------------------------------------------
  // A5 — DELETE /categories/:id
  // ---------------------------------------------------------------------
  async removeCategory(id: number): Promise<{ id: number }> {
    const category = await this.findActiveCategoryOrFail(id);

    // T-02 (design §5 rule 6, forward pointer from T-01): a category can be
    // deleted only when it has no lists. Blocked here, before the physical
    // delete (D-CTL-5), with a warn-level log (design §9) and a 409 whose
    // message names the blocking lists (R-CTL-002 "Delete a non-empty
    // category").
    const blockingLists = await this.listRepository.find({
      where: { category_id: id, is_active: true },
      order: { id: 'ASC' },
    });

    if (blockingLists.length > 0) {
      const listNames = blockingLists.map((list) => list.name).join(', ');
      this.logger._warn(
        `control_lists.blocked_delete entity=control_list_category id=${id} reason=has_lists count=${blockingLists.length}`,
      );
      this.throwNonFieldConflict(
        `Category "${category.name}" cannot be deleted while it has lists: ${listNames}`,
      );
    }

    // Physical delete (D-CTL-5).
    await this.categoryRepository.delete(id);

    this.logWrite(
      'deleted',
      'control_list_category',
      id,
      category.portfolio_id,
    );

    return { id };
  }

  // ---------------------------------------------------------------------
  // A6 — POST /lists
  // ---------------------------------------------------------------------
  async createList(dto: CreateControlListDto): Promise<ControlListResponse> {
    const category = await this.findActiveCategoryOrFail(dto.categoryId);
    await this.assertListKeyAvailable(category.portfolio_id, dto.listKey);

    const newList: Partial<ControlList> = {
      portfolio_id: category.portfolio_id,
      category_id: category.id,
      list_key: dto.listKey,
      name: dto.name,
      // Leader-adjudicated forward pointer (T-03 rework attempt 2): same
      // normalization on create as on update (categories, lists, values).
      description: this.normalizeDescription(dto.description),
      code_prefix: dto.codePrefix ?? this.deriveDefaultCodePrefix(dto.listKey),
      is_system: false,
      ...this.currentUser.audit(SetAuditEnum.NEW),
    };

    let saved: ControlList;
    try {
      saved = await this.listRepository.save(newList);
    } catch (error) {
      this.rethrowAsListConflictIfDuplicate(error, dto.listKey);
    }

    this.logWrite('created', 'control_list', saved.id, saved.portfolio_id);

    return this.mapList(saved);
  }

  // ---------------------------------------------------------------------
  // A7 — PATCH /lists/:id
  // ---------------------------------------------------------------------
  async updateList(
    id: number,
    dto: UpdateControlListDto,
  ): Promise<ControlListResponse> {
    const list = await this.findActiveListOrFail(id);

    let categoryId = list.category_id;
    if (dto.categoryId !== undefined && dto.categoryId !== list.category_id) {
      const newCategory = await this.findActiveCategoryOrFail(dto.categoryId);
      // R-CTL-001 / D-CTL-13 (judgment J-4): moving a list to a category of
      // another portfolio is a 400, never a silent move and never a 409.
      if (newCategory.portfolio_id !== list.portfolio_id) {
        throw new BadRequestException(
          `Category ${dto.categoryId} belongs to a different portfolio than list ${id}`,
        );
      }
      categoryId = newCategory.id;
    }

    const update: Partial<ControlList> = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined
        ? { description: this.normalizeDescription(dto.description) }
        : {}),
      ...(dto.categoryId !== undefined ? { category_id: categoryId } : {}),
      ...this.currentUser.audit(SetAuditEnum.UPDATE),
    };

    await this.listRepository.update(id, update);

    const updated = await this.listRepository.findOne({ where: { id } });

    this.logWrite('updated', 'control_list', id, list.portfolio_id);

    return this.mapList(updated);
  }

  // ---------------------------------------------------------------------
  // A8 — DELETE /lists/:id
  // ---------------------------------------------------------------------
  async removeList(id: number): Promise<{ id: number }> {
    const list = await this.findActiveListOrFail(id);

    // R-CTL-003 "System list cannot be deleted".
    if (list.is_system) {
      this.logger._warn(
        `control_lists.blocked_delete entity=control_list id=${id} reason=is_system`,
      );
      this.throwNonFieldConflict(
        `List "${list.name}" (key ${list.list_key}) is a system list and cannot be deleted`,
      );
    }

    // T-03 (R-CTL-003 "Custom list lifecycle", non-empty branch; forward
    // pointer from T-02): a list with values cannot be deleted, regardless
    // of whether those values are active or deactivated — physical delete
    // (D-CTL-5) means a deactivated value is still a row. The in-use
    // protection on a VALUE's own delete (A12) is T-04's; this is a
    // separate rule on the LIST's delete.
    const valueCount = await this.valueRepository.count({
      where: { list_id: id },
    });
    if (valueCount > 0) {
      this.logger._warn(
        `control_lists.blocked_delete entity=control_list id=${id} reason=has_values count=${valueCount}`,
      );
      this.throwNonFieldConflict(
        `List "${list.name}" (key ${list.list_key}) cannot be deleted while it has values`,
      );
    }

    await this.listRepository.delete(id);

    this.logWrite('deleted', 'control_list', id, list.portfolio_id);

    return { id };
  }

  // ---------------------------------------------------------------------
  // A9 — GET /lists/:id/values
  // ---------------------------------------------------------------------
  async getValues(listId: number): Promise<ControlListValueResponse[]> {
    await this.findActiveListOrFail(listId);

    const values = await this.valueRepository.find({
      where: { list_id: listId },
      order: { display_order: 'ASC', id: 'ASC' },
    });

    // T-04 (design §5 rule 5): inUse is the sum of every registered
    // provider's count for each value id — 0 when none is registered yet.
    const counts = await this.usageRegistry.getInUseCounts(
      values.map((value) => value.id),
    );

    return values.map((value) =>
      this.mapValue(value, counts.get(value.id) ?? 0),
    );
  }

  // ---------------------------------------------------------------------
  // A13 — GET /by-key/:listKey/values?portfolioId=&activeOnly=
  // ---------------------------------------------------------------------
  // Consumer read (design.md §8): no @Roles — any authenticated user.
  // R-CTL-006 "Ordered read": display order first, then natural code order
  // (`UOM-2` before `UOM-10` at equal order), mirroring the admin table's
  // own ordering semantics (R-CTL-009, client naturalCompare).
  async getValuesByKey(
    portfolioId: number,
    listKey: string,
    activeOnly: boolean,
  ): Promise<ControlListValueResponse[]> {
    const list = await this.listRepository.findOne({
      where: { portfolio_id: portfolioId, list_key: listKey, is_active: true },
    });
    if (!list) {
      throw new NotFoundException(
        `List "${listKey}" not found for portfolio ${portfolioId}`,
      );
    }

    const values = await this.valueRepository.find({
      where: activeOnly
        ? { list_id: list.id, is_active: true }
        : { list_id: list.id },
    });

    const sorted = [...values].sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return controlListNaturalCompare(a.code, b.code);
    });

    const counts = await this.usageRegistry.getInUseCounts(
      sorted.map((value) => value.id),
    );

    return sorted.map((value) =>
      this.mapValue(value, counts.get(value.id) ?? 0),
    );
  }

  // ---------------------------------------------------------------------
  // A10 — POST /lists/:id/values
  // ---------------------------------------------------------------------
  async createValue(
    listId: number,
    dto: CreateControlListValueDto,
  ): Promise<ControlListValueResponse> {
    const list = await this.findActiveListOrFail(listId);

    // Rework attempt 2 (Reviewer risk-lens FAIL, Leader decision A10):
    // attempt 1 only proposed when `dto.code === undefined`, so `''`,
    // whitespace (the DTO's own `@Transform` already collapses
    // whitespace-only to `''` before this runs — see
    // `CreateControlListValueDto.code`) and a literal `null` (the DTO has
    // no `@IsNotEmpty()`, by design, so `null` reaches here unchanged) all
    // skipped the proposal, saved straight into the NOT NULL `code` column,
    // and either stored `''`/blew up with a raw 1048/500 or produced a
    // false 409. `== null` deliberately catches BOTH `undefined` and
    // `null` in one check (the DTO's declared type is `string | undefined`,
    // but `null` reaches here at runtime regardless — see the dto's own
    // comment). A non-empty, already-trimmed code falls through unchanged.
    let code = dto.code;
    if (code == null || code === '') {
      const existingValues = await this.valueRepository.find({
        where: { list_id: list.id },
      });
      code = this.proposeNextCode(
        list,
        existingValues.map((value) => value.code),
      );
    }

    await this.assertValueFieldsAvailable(list.id, code, dto.value);

    const newValue: Partial<ControlListValue> = {
      list_id: list.id,
      code,
      value: dto.value,
      // Leader-adjudicated forward pointer (T-03 rework attempt 2): same
      // create-time normalization as categories/lists above.
      description: this.normalizeDescription(dto.description),
      display_order: dto.displayOrder ?? 0,
      is_active: dto.isActive ?? true,
      ...this.currentUser.audit(SetAuditEnum.NEW),
    };

    let saved: ControlListValue;
    try {
      saved = await this.valueRepository.save(newValue);
    } catch (error) {
      this.rethrowAsValueConflictIfDuplicate(error, code, dto.value);
    }

    this.logWrite('created', 'control_list_value', saved.id, list.portfolio_id);

    return this.mapValue(saved);
  }

  // ---------------------------------------------------------------------
  // A11 — PATCH /values/:id
  // ---------------------------------------------------------------------
  async updateValue(
    id: number,
    dto: UpdateControlListValueDto,
  ): Promise<ControlListValueResponse> {
    const value = await this.findValueOrFail(id);
    const list = await this.findListForValue(value);

    if (dto.code !== undefined && dto.code !== value.code) {
      await this.assertCodeAvailable(value.list_id, dto.code, id);
    }
    if (dto.value !== undefined && dto.value !== value.value) {
      await this.assertValueNameAvailable(value.list_id, dto.value, id);
    }

    const update: Partial<ControlListValue> = {
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.value !== undefined ? { value: dto.value } : {}),
      ...(dto.description !== undefined
        ? { description: this.normalizeDescription(dto.description) }
        : {}),
      ...(dto.displayOrder !== undefined
        ? { display_order: dto.displayOrder }
        : {}),
      ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
      ...this.currentUser.audit(SetAuditEnum.UPDATE),
    };

    try {
      await this.valueRepository.update(id, update);
    } catch (error) {
      this.rethrowAsValueConflictIfDuplicate(
        error,
        dto.code ?? value.code,
        dto.value ?? value.value,
      );
    }

    const updated = await this.valueRepository.findOne({ where: { id } });

    this.logWrite('updated', 'control_list_value', id, list.portfolio_id);

    return this.mapValue(updated);
  }

  // ---------------------------------------------------------------------
  // A12 — DELETE /values/:id
  // ---------------------------------------------------------------------
  async removeValue(id: number): Promise<{ id: number }> {
    const value = await this.findValueOrFail(id);
    const list = await this.findListForValue(value);

    // T-04 (design §5 rule 5, R-CTL-005): refuse when the value is
    // referenced by at least one record of a registered consumer. The
    // description states the count and proposes deactivation (falsifier 2:
    // dropping this check must fail on the ConflictException itself, not on
    // its wording).
    const inUse = await this.usageRegistry.getInUseCount(id);
    if (inUse > 0) {
      this.logger._warn(
        `control_lists.blocked_delete entity=control_list_value id=${id} reason=in_use count=${inUse}`,
      );
      this.throwNonFieldConflict(
        `Value "${value.value}" is referenced by ${inUse} record(s) and cannot be deleted; deactivate it instead`,
      );
    }

    // Physical delete (D-CTL-5). The list-has-values rule lives on A8, not
    // here.
    await this.valueRepository.delete(id);

    this.logWrite('deleted', 'control_list_value', id, list.portfolio_id);

    return { id };
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  private async assertPortfolioExists(portfolioId: number): Promise<void> {
    const portfolio = await this.portfoliosService.findOne(portfolioId);
    if (!portfolio) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }
  }

  private async findActiveCategoryOrFail(
    id: number,
  ): Promise<ControlListCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id, is_active: true },
    });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  private async findActiveListOrFail(id: number): Promise<ControlList> {
    const list = await this.listRepository.findOne({
      where: { id, is_active: true },
    });
    if (!list) {
      throw new NotFoundException(`List ${id} not found`);
    }
    return list;
  }

  // Unlike `findActiveCategoryOrFail` / `findActiveListOrFail`, this does
  // NOT filter `is_active: true`. Deletes are physical for all three tables
  // (D-CTL-5), so `is_active` on a value is never a soft-delete marker —
  // it is the Active flag an admin toggles (D-CTL-4). A deactivated value
  // must still be findable, for both the admin read (R-CTL-004 "Deactivate"
  // — "IT MUST still be returned by the admin read") and for re-activating
  // it later.
  private async findValueOrFail(id: number): Promise<ControlListValue> {
    const value = await this.valueRepository.findOne({ where: { id } });
    if (!value) {
      throw new NotFoundException(`Value ${id} not found`);
    }
    return value;
  }

  private async findListForValue(
    value: ControlListValue,
  ): Promise<ControlList> {
    const list = await this.listRepository.findOne({
      where: { id: value.list_id },
    });
    if (!list) {
      throw new NotFoundException(`List ${value.list_id} not found`);
    }
    return list;
  }

  private async assertCategoryNameAvailable(
    portfolioId: number,
    name: string,
    excludeId?: number,
  ): Promise<void> {
    // Pre-check for a clean, field-named 409. The column's explicit
    // utf8mb4_unicode_ci collation makes this `=` comparison already
    // case-insensitive (design.md §3, Premise Ledger P-4), matching
    // R-CTL-002's "Duplicate name" case-variant scenario.
    const existing = await this.categoryRepository.findOne({
      where: { portfolio_id: portfolioId, name, is_active: true },
    });
    if (existing && existing.id !== excludeId) {
      this.throwDuplicateNameConflict(name);
    }
  }

  private async assertListKeyAvailable(
    portfolioId: number,
    listKey: string,
  ): Promise<void> {
    // Scoped by portfolio_id only (R-CTL-003 "Same key in two portfolios":
    // the same key is allowed once per portfolio, so a match in another
    // portfolio must never block this create).
    const existing = await this.listRepository.findOne({
      where: { portfolio_id: portfolioId, list_key: listKey, is_active: true },
    });
    if (existing) {
      this.throwDuplicateListKeyConflict(listKey);
    }
  }

  // R-CTL-004 "Duplicate code or value": both are checked, case-insensitive
  // via the column's explicit collation (P-4), scoped to the list. Used by
  // createValue (code AND value against the proposed/supplied pair).
  private async assertValueFieldsAvailable(
    listId: number,
    code: string,
    value: string,
  ): Promise<void> {
    await this.assertCodeAvailable(listId, code);
    await this.assertValueNameAvailable(listId, value);
  }

  private async assertCodeAvailable(
    listId: number,
    code: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.valueRepository.findOne({
      where: { list_id: listId, code },
    });
    if (existing && existing.id !== excludeId) {
      this.throwDuplicateValueConflict(code, 'code');
    }
  }

  private async assertValueNameAvailable(
    listId: number,
    value: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.valueRepository.findOne({
      where: { list_id: listId, value },
    });
    if (existing && existing.id !== excludeId) {
      this.throwDuplicateValueConflict(value, 'value');
    }
  }

  // design.md §5 rule 2 / D-CTL-11: the service — never `sqlErrorsHelper`
  // (P-14) — catches a concurrent-insert race at the unique index (errno
  // 1062) and rethrows a field-named 409. Any other error is rethrown as-is.
  // `error instanceof QueryFailedError` would reject a plain mocked
  // `{ errno: 1062 }` in unit tests (service tests never construct a real
  // QueryFailedError), so the errno check alone is the gate — exactly what
  // the simulated-1062 falsifier in tasks.md exercises.
  private rethrowAsConflictIfDuplicate(error: unknown, name: string): never {
    const errno = (error as { errno?: number })?.errno;

    if (errno === MYSQL_DUPLICATE_ENTRY_ERRNO) {
      this.throwDuplicateNameConflict(name);
    }
    throw error;
  }

  private rethrowAsListConflictIfDuplicate(
    error: unknown,
    listKey: string,
  ): never {
    const errno = (error as { errno?: number })?.errno;

    if (errno === MYSQL_DUPLICATE_ENTRY_ERRNO) {
      this.throwDuplicateListKeyConflict(listKey);
    }
    throw error;
  }

  // Two unique indexes guard this table (`uq_control_list_values_list_code`,
  // `uq_control_list_values_list_value` — design §3), so a race caught here
  // (as opposed to the synchronous pre-check above) must disambiguate which
  // one tripped from the driver error's message/sqlMessage, to keep the
  // field-named 409 contract (code vs value) even on this backstop path.
  // Falls back to 'code' when neither index name is present in the message
  // (defensive; the pre-check already covers the common, non-race case).
  private rethrowAsValueConflictIfDuplicate(
    error: unknown,
    code: string,
    value: string,
  ): never {
    const errno = (error as { errno?: number })?.errno;

    if (errno === MYSQL_DUPLICATE_ENTRY_ERRNO) {
      const message = String(
        (error as { sqlMessage?: string; message?: string })?.sqlMessage ??
          (error as { message?: string })?.message ??
          '',
      );
      if (message.includes('uq_control_list_values_list_value')) {
        this.throwDuplicateValueConflict(value, 'value');
      }
      this.throwDuplicateValueConflict(code, 'code');
    }
    throw error;
  }

  private throwDuplicateNameConflict(name: string): never {
    throw new ConflictException({
      message: {
        description: `A category named "${name}" already exists in this portfolio`,
        field: 'name',
      },
    });
  }

  private throwDuplicateListKeyConflict(listKey: string): never {
    throw new ConflictException({
      message: {
        description: `A list with key "${listKey}" already exists in this portfolio`,
        field: 'listKey',
      },
    });
  }

  private throwDuplicateValueConflict(
    fieldValue: string,
    field: 'code' | 'value',
  ): never {
    throw new ConflictException({
      message: {
        description: `A value with ${field} "${fieldValue}" already exists in this list`,
        field,
      },
    });
  }

  // Non-field 409s (system-list delete, category-has-lists): the same
  // `{message: {description}}` envelope as the field-named conflicts above,
  // but with no `field` key — GlobalExceptions then puts the OBJECT
  // `{description}` (never a bare string) on the wire as `errors` (Leader
  // contract note, T-02), which the client reads without a field to bind
  // to any one input.
  private throwNonFieldConflict(description: string): never {
    throw new ConflictException({
      message: { description },
    });
  }

  // Risk Reviewer defect 3 (T-02 rework attempt 2): the client sends
  // `description: ''` on PATCH when the field is emptied (and may also send
  // `null`). Both mean "clear it" — normalized to a stored NULL, not a
  // stored `''`, so `description ?? null` in the mappers below keeps a
  // single representation of "no description" (never `''` AND `NULL`
  // meaning the same thing on the wire). Applies identically to categories
  // and lists; `undefined` (field omitted) is handled by the caller, not
  // here — this only runs when the caller already decided the field is
  // present in the PATCH body.
  private normalizeDescription(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || value.trim() === '') {
      return null;
    }
    return value;
  }

  // T-03 owns the real `<prefix>-<nn>` proposal logic (code_prefix is not
  // consumed until values exist). This only supplies a NOT NULL column
  // value when an admin creates a custom list without naming one: up to 10
  // alphanumeric characters of the key, uppercased.
  private deriveDefaultCodePrefix(listKey: string): string {
    const alnum = listKey.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return alnum.slice(0, 10) || 'LIST';
  }

  // design.md §5 rule 4: `<prefix>-<nn>` zero-padded to 2 digits (e.g.
  // UOM-08 after UOM-07); `org.level`'s prefix `L` is the one exception —
  // no dash, no zero-padding (`L5` after `L4`). `nn`/`n` is 1 + the highest
  // numeric suffix already in the list; a list with no matching codes yet
  // starts at 1. The admin can still edit the proposal (F-6).
  private proposeNextCode(list: ControlList, existingCodes: string[]): string {
    const prefix = list.code_prefix;
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isOrgLevelFormat = prefix === 'L';
    const pattern = isOrgLevelFormat
      ? new RegExp(`^${escapedPrefix}(\\d+)$`)
      : new RegExp(`^${escapedPrefix}-(\\d+)$`);

    let maxSuffix = 0;
    for (const code of existingCodes) {
      const match = pattern.exec(code);
      if (match) {
        const suffix = parseInt(match[1], 10);
        if (suffix > maxSuffix) {
          maxSuffix = suffix;
        }
      }
    }

    const next = maxSuffix + 1;
    return isOrgLevelFormat
      ? `${prefix}${next}`
      : `${prefix}-${String(next).padStart(2, '0')}`;
  }

  // design.md §9: info-level log through LoggerUtil on create/update/delete,
  // naming the entity, its id, its portfolio and the acting user id.
  private logWrite(
    action: 'created' | 'updated' | 'deleted',
    entity: string,
    id: number,
    portfolioId: number,
  ): void {
    this.logger._log(
      `control_lists.${action} entity=${entity} id=${id} portfolio_id=${portfolioId} user_id=${this.currentUser.user_id}`,
    );
  }

  private mapCategory(
    category: ControlListCategory,
    listEntries: { list: ControlList; valueCount: number }[] = [],
  ): ControlListCategoryResponse {
    return {
      id: category.id,
      portfolioId: category.portfolio_id,
      name: category.name,
      description: category.description ?? null,
      displayOrder: category.display_order,
      lists: listEntries.map((entry) =>
        this.mapListSummary(entry.list, entry.valueCount),
      ),
    };
  }

  // valueCount is the real row count per list (T-03). usedBy is derived at
  // read time from the registry (T-04, D-CTL-12) — nothing stored.
  private mapListSummary(list: ControlList, valueCount = 0): ListSummary {
    return {
      id: list.id,
      key: list.list_key,
      name: list.name,
      description: list.description ?? null,
      // D-CTL-17: additive field so the client can mirror proposeNextCode.
      codePrefix: list.code_prefix,
      valueCount,
      isSystem: list.is_system,
      usedBy: this.usageRegistry.getConsumerNamesForKey(list.list_key),
    };
  }

  // inUse is the sum of every registered provider's count for this value id
  // (design §5 rule 5, T-04) — the caller (getValues/getValuesByKey) looks
  // it up once per batch and passes it in; 0 when none is registered yet.
  private mapValue(
    value: ControlListValue,
    inUse = 0,
  ): ControlListValueResponse {
    return {
      id: value.id,
      listId: value.list_id,
      code: value.code,
      value: value.value,
      description: value.description ?? null,
      displayOrder: value.display_order,
      isActive: value.is_active,
      inUse,
    };
  }

  private mapList(list: ControlList): ControlListResponse {
    return {
      id: list.id,
      portfolioId: list.portfolio_id,
      categoryId: list.category_id,
      key: list.list_key,
      name: list.name,
      description: list.description ?? null,
      codePrefix: list.code_prefix,
      isSystem: list.is_system,
    };
  }
}
