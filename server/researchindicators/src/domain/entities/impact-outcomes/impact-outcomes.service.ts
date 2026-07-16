import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateImpactOutcomeDto } from './dto/create-impact-outcome.dto';
import { UpdateImpactOutcomeDto } from './dto/update-impact-outcome.dto';
import { ImpactOutcomesRepository } from './repositories/impact-outcomes.repository';
import { PortfoliosService } from '../portfolios/portfolios.service';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { ImpactOutcome } from './entities/impact-outcome.entity';
import { FindOptionsWhere } from 'typeorm';

@Injectable()
export class ImpactOutcomesService {
  constructor(
    private readonly mainRepo: ImpactOutcomesRepository,
    private readonly portfoliosService: PortfoliosService,
    private readonly currentUser: CurrentUserUtil,
  ) {}

  async create(createImpactOutcomeDto: CreateImpactOutcomeDto) {
    const { name, description, portfolio_id } = createImpactOutcomeDto;

    const portfolio =
      await this.portfoliosService.validatePortfolio(portfolio_id);
    const dataToSave: Partial<ImpactOutcome> = {
      name,
      description,
      portfolio_id: portfolio.id,
      ...this.currentUser.audit(SetAuditEnum.BOTH),
    };
    const impactOutcome = await this.mainRepo.save(dataToSave);
    return impactOutcome;
  }

  async findAll(portfolioId?: number) {
    const where: FindOptionsWhere<ImpactOutcome> = {
      is_active: true,
    };

    if (portfolioId) {
      where.portfolio_id = portfolioId;
    }

    return this.mainRepo.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number) {
    if (!id) return null;

    return this.mainRepo.findOne({
      where: { id, is_active: true },
      order: { name: 'ASC' },
    });
  }

  async update(id: number, updateImpactOutcomeDto: UpdateImpactOutcomeDto) {
    const { name, description, portfolio_id } = updateImpactOutcomeDto;

    const portfolio =
      await this.portfoliosService.validatePortfolio(portfolio_id);
    const dataToUpdate: Partial<ImpactOutcome> = {
      name,
      description,
      portfolio_id: portfolio.id,
      ...this.currentUser.audit(SetAuditEnum.UPDATE),
    };
    await this.mainRepo.update(id, dataToUpdate);
    return this.mainRepo.findOne({
      where: { id, is_active: true },
      order: { name: 'ASC' },
    });
  }

  async remove(id: number) {
    const result = await this.mainRepo.update(id, {
      is_active: false,
      deleted_at: new Date(),
      ...this.currentUser.audit(SetAuditEnum.UPDATE),
    });
    if (result.affected === 0) {
      throw new BadRequestException('Impact outcome not found');
    }

    return id;
  }
}
