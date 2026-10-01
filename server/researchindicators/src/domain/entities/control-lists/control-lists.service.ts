import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { CreateControlListCategoryDto } from './dto/create-control-list-category.dto';
import { UpdateControlListCategoryDto } from './dto/update-control-list-category.dto';
import { ControlListCategory } from './entities/control-list-category.entity';
import { PortfoliosService } from '../portfolios/portfolios.service';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import {
  ControlListCategoryResponse,
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

    return categories.map((category) => this.mapCategory(category));
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
        ? { description: dto.description }
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

    // Physical delete (D-CTL-5). No "blocked by lists" check in this
    // slice — control_lists does not exist yet (that rule is T-02's).
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

  private throwDuplicateNameConflict(name: string): never {
    throw new ConflictException({
      message: {
        description: `A category named "${name}" already exists in this portfolio`,
        field: 'name',
      },
    });
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
  ): ControlListCategoryResponse {
    return {
      id: category.id,
      portfolioId: category.portfolio_id,
      name: category.name,
      description: category.description ?? null,
      displayOrder: category.display_order,
      lists: [],
    };
  }
}
