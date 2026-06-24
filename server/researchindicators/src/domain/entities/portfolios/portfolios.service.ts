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

@Injectable()
export class PortfoliosService {
  private readonly logger: CgiarLogger = new CgiarLogger(
    PortfoliosService.name,
  );

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
    return this.mainRepo.findOne({
      where: {
        id: id,
        is_active: true,
      },
    });
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
    const response = await this.mainRepo.update(id, { is_active: false });
    if (response.affected === 0) {
      throw new BadRequestException(`Portfolio not found`);
    }
    return id;
  }
}
