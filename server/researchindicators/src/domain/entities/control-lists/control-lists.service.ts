import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { ControlListRepository } from './repositories/control-list.repository';
import { CreateControlListCategoryDto } from './dto/create-control-list-category.dto';
import { UpdateControlListCategoryDto } from './dto/update-control-list-category.dto';
import { CreateControlListDto } from './dto/create-control-list.dto';
import { UpdateControlListDto } from './dto/update-control-list.dto';
import { ControlListCategory } from './entities/control-list-category.entity';
import { ControlList } from './entities/control-list.entity';
import { PortfoliosService } from '../portfolios/portfolios.service';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import {
  ControlListCategoryResponse,
  ControlListResponse,
  ListSummary,
  PortfolioCategoriesSummary,
} from './control-lists.types';
import { LoggerUtil } from '../../shared/utils/logger.util';

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
    private readonly portfoliosService: PortfoliosService,
    private readonly currentUser: CurrentUserUtil,
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

    return categories.map((category) =>
      this.mapCategory(
        category,
        lists.filter((list) => list.category_id === category.id),
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
      description: dto.description,
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
      description: dto.description,
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

    // R-CTL-003 "System list cannot be deleted". The "has values" block
    // (R-CTL-003 "Custom list lifecycle", non-empty branch) is T-03's — the
    // values table does not exist in this slice.
    if (list.is_system) {
      this.logger._warn(
        `control_lists.blocked_delete entity=control_list id=${id} reason=is_system`,
      );
      this.throwNonFieldConflict(
        `List "${list.name}" (key ${list.list_key}) is a system list and cannot be deleted`,
      );
    }

    await this.listRepository.delete(id);

    this.logWrite('deleted', 'control_list', id, list.portfolio_id);

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
    lists: ControlList[] = [],
  ): ControlListCategoryResponse {
    return {
      id: category.id,
      portfolioId: category.portfolio_id,
      name: category.name,
      description: category.description ?? null,
      displayOrder: category.display_order,
      lists: lists.map((list) => this.mapListSummary(list)),
    };
  }

  // valueCount stays 0 and usedBy stays [] until T-03 (values) and T-04
  // (the usage registry) exist.
  private mapListSummary(list: ControlList): ListSummary {
    return {
      id: list.id,
      key: list.list_key,
      name: list.name,
      description: list.description ?? null,
      valueCount: 0,
      isSystem: list.is_system,
      usedBy: [],
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
