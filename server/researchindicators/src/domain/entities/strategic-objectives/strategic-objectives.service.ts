import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStrategicObjectiveDto } from './dto/create-strategic-objective.dto';
import { UpdateStrategicObjectiveDto } from './dto/update-strategic-objective.dto';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { StrategicObjective } from './entities/strategic-objective.entity';
import { StrategicObjectivesRepository } from './repositories/strategic-objectives.repository';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { FindOptionsWhere } from 'typeorm';

@Injectable()
export class StrategicObjectivesService {
  constructor(
    private readonly portfoliosService: PortfoliosService,
    private readonly mainRepo: StrategicObjectivesRepository,
    private readonly currentUser: CurrentUserUtil,
  ) {}

  async create(data: CreateStrategicObjectiveDto) {
    const { name, description, portfolio_id } = data;
    const portfolio = await this.portfoliosService.findOne(portfolio_id);
    if (!portfolio) {
      throw new BadRequestException('Portfolio not found');
    }

    const dataToSave: Partial<StrategicObjective> = {
      name,
      description,
      portfolio_id,
      ...this.currentUser.audit(SetAuditEnum.BOTH),
    };

    const strategicObjective = await this.mainRepo.save(dataToSave);
    return strategicObjective;
  }

  async findAll(portfolioId?: number) {
    const where: FindOptionsWhere<StrategicObjective> = {
      is_active: true,
    };

    if (portfolioId) {
      where.portfolio_id = portfolioId;
    }

    const strategicObjectives = await this.mainRepo.find({
      where,
      order: { name: 'ASC' },
    });
    return strategicObjectives;
  }

  async findOne(id: number) {
    if (!id) {
      throw new BadRequestException('Id is required');
    }
    const strategicObjective = await this.mainRepo.findOne({
      where: { id, is_active: true },
    });
    if (!strategicObjective) {
      throw new NotFoundException('Strategic objective not found');
    }
    return strategicObjective;
  }

  async update(
    id: number,
    updateStrategicObjectiveDto: UpdateStrategicObjectiveDto,
  ) {
    const { portfolio_id } = updateStrategicObjectiveDto;
    const portfolio = await this.portfoliosService.findOne(portfolio_id);
    if (!portfolio) {
      throw new BadRequestException(
        `Portfolio by id ${portfolio_id} not found`,
      );
    }
    const strategicObjective = await this.mainRepo.findOne({
      where: { id, is_active: true },
    });
    if (!strategicObjective) {
      throw new NotFoundException('Strategic objective not found');
    }
    await this.mainRepo.update(id, updateStrategicObjectiveDto);
    return { ...strategicObjective, ...updateStrategicObjectiveDto };
  }

  async remove(id: number) {
    const strategicObjective = await this.mainRepo.findOne({
      where: { id, is_active: true },
    });
    if (!strategicObjective) {
      throw new NotFoundException('Strategic objective not found');
    }
    const response = await this.mainRepo.update(id, { is_active: false });
    if (response.affected === 0) {
      throw new BadRequestException('Strategic objective not found');
    }
    return id;
  }
}
