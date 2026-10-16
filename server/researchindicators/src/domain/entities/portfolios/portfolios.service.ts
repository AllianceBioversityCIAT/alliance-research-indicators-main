import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { PortfoliosRepository } from './repositories/portfolios.repository';
import { CgiarLogger } from '../../shared/utils/cgiar-logs/logs.util';
import { Portfolio } from './entities/portfolio.entity';
import { validObject } from '../../shared/utils/object.utils';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

@Injectable()
export class PortfoliosService {
  private readonly logger: CgiarLogger = new CgiarLogger(
    PortfoliosService.name,
  );

  // Per-request memo of year -> resolved portfolio (or null). PortfoliosService
  // is request-scoped via CurrentUserUtil bubbling, so this cache cannot
  // outlive the request or leak between users/batches (design.md §2.3, DD-2).
  private readonly portfolioByYear = new Map<number, Portfolio | null>();

  constructor(
    private readonly mainRepo: PortfoliosRepository,
    private readonly currentUser: CurrentUserUtil,
  ) {}

  async create(createPortfolioDto: CreatePortfolioDto) {
    const { isValid, invalidFields } = validObject(createPortfolioDto, [
      'start_year',
      'end_year',
    ]);

    if (!isValid) {
      throw new BadRequestException(`Invalid fields: ${invalidFields}`);
    }

    const newPortfolio: Partial<Portfolio> = {
      name: createPortfolioDto?.name,
      description: createPortfolioDto?.description,
      start_year: createPortfolioDto.start_year,
      end_year: createPortfolioDto.end_year,
      ...this.currentUser.audit(SetAuditEnum.NEW),
    };

    return this.mainRepo.save(newPortfolio);
  }

  async findAll() {
    return this.mainRepo.find({
      where: {
        is_active: true,
      },
    });
  }

  async findOne(id: number) {
    if (!id) return null;
    return this.mainRepo.findOne({
      where: {
        id: id,
        is_active: true,
      },
    });
  }

  /**
   * Resolves the active portfolio whose year range covers `year`, mirroring
   * the `get_portfolio_id_by_result` SQL predicate: `start_year <= year AND
   * end_year >= year AND is_active = true`, ordered by `id`, first row only.
   * Never throws — an unresolvable year returns null, matching `findOne`'s
   * "return null, don't throw" posture (not `validatePortfolio`'s).
   * Memoized per year on the instance for the lifetime of the request.
   */
  async findByYear(year: number): Promise<Portfolio | null> {
    if (this.portfolioByYear.has(year)) {
      return this.portfolioByYear.get(year);
    }

    const portfolio = await this.mainRepo.findOne({
      where: {
        start_year: LessThanOrEqual(year),
        end_year: MoreThanOrEqual(year),
        is_active: true,
      },
      order: { id: 'ASC' },
    });

    this.portfolioByYear.set(year, portfolio ?? null);
    return portfolio ?? null;
  }

  async validatePortfolio(portfolio_id: number) {
    const portfolio = await this.findOne(portfolio_id);
    if (!portfolio) {
      throw new BadRequestException('Portfolio not found');
    }
    return portfolio;
  }

  async update(id: number, updatePortfolioDto: UpdatePortfolioDto) {
    const portfolio = await this.mainRepo.findOne({ where: { id } });
    if (!portfolio) {
      throw new BadRequestException(`Portfolio not found`);
    }

    const { isValid, invalidFields } = validObject(updatePortfolioDto, [
      'start_year',
      'end_year',
    ]);
    if (!isValid) {
      throw new BadRequestException(`Invalid fields: ${invalidFields}`);
    }

    const isSystemAdmin = this.currentUser.roles.includes(
      SecRolesEnum.SYSTEM_ADMIN,
    );

    const updatePortfolio: Partial<Portfolio> = {
      name: updatePortfolioDto?.name,
      description: updatePortfolioDto?.description,
      ...(isSystemAdmin
        ? {
            start_year: updatePortfolioDto.start_year,
            end_year: updatePortfolioDto.end_year,
          }
        : {}),
      ...this.currentUser.audit(SetAuditEnum.UPDATE),
    };
    await this.mainRepo.update(id, updatePortfolio);
    return this.mainRepo.findOne({ where: { id } });
  }

  async remove(id: number): Promise<number> {
    const response = await this.mainRepo.update(id, {
      is_active: false,
      deleted_at: new Date(),
      ...this.currentUser.audit(SetAuditEnum.UPDATE),
    });
    if (response.affected === 0) {
      throw new BadRequestException(`Portfolio not found`);
    }
    return id;
  }
}
