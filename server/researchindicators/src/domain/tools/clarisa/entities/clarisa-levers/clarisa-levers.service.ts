import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaLever } from './entities/clarisa-lever.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../../../shared/utils/current-user.util';
import { AppConfig } from '../../../../shared/utils/app-config.util';
import { resolveLeverIconUrl } from './lever-icon.util';
import { CreateClarisaLeverDto } from './dto/clarisa-levers-raw.dto';
import { validObjectAnyOf } from '../../../../shared/utils/object.utils';
import { Portfolio } from '../../../../entities/portfolios/entities/portfolio.entity';
@Injectable()
export class ClarisaLeversService extends ControlListBaseService<
  ClarisaLever,
  Repository<ClarisaLever>
> {
  constructor(
    public readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
    private readonly appConfig: AppConfig,
  ) {
    super(
      ClarisaLever,
      dataSource.getRepository(ClarisaLever),
      currentUser,
      'short_name',
    );
  }

  resolveIconUrl(
    shortName?: string | null,
    fullName?: string | null,
    leverId?: number | null,
  ): string | null {
    return resolveLeverIconUrl(this.appConfig.BUCKET_URL, {
      shortName,
      fullName,
      leverId,
    });
  }

  async findAllWithPortfolio(portfolioId?: number): Promise<ClarisaLever[]> {
    return this.mainRepo.find({
      where: {
        portfolio_id: portfolioId,
        is_active: true,
      },
    });
  }
  async create(
    createClarisaLeverDto: CreateClarisaLeverDto,
  ): Promise<ClarisaLever> {
    const portfolio = await this.dataSource
      .getRepository(Portfolio)
      .findOne({ where: { id: createClarisaLeverDto?.portfolio_id } });

    if (!portfolio) {
      throw new BadRequestException(`Portfolio not found`);
    }

    const validation = validObjectAnyOf(createClarisaLeverDto, [
      'full_name',
      'full_name',
      'other_names',
    ]);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Required some of the following fields: ${validation.invalidFields.join(', ')}`,
      );
    }

    const clarisaLever: Partial<ClarisaLever> = {
      full_name: createClarisaLeverDto?.full_name,
      other_names: createClarisaLeverDto?.other_names,
      short_name: createClarisaLeverDto?.short_name,
      portfolio_id: createClarisaLeverDto?.portfolio_id,
      ...this.currentUser.audit(SetAuditEnum.NEW),
    };
    return this.mainRepo.save(clarisaLever);
  }

  async update(
    id: number,
    updateClarisaLeverDto: CreateClarisaLeverDto,
  ): Promise<ClarisaLever> {
    const clarisaLever = await this.mainRepo.findOne({ where: { id } });
    if (!clarisaLever) {
      throw new BadRequestException(`Clarisa lever not found`);
    }

    const validation = validObjectAnyOf(updateClarisaLeverDto, [
      'full_name',
      'full_name',
      'other_names',
    ]);

    if (!validation.isValid) {
      throw new BadRequestException(
        `Required some of the following fields: ${validation.invalidFields.join(', ')}`,
      );
    }

    const portfolio = await this.dataSource
      .getRepository(Portfolio)
      .findOne({ where: { id: updateClarisaLeverDto?.portfolio_id } });
    if (!portfolio) {
      throw new BadRequestException(`Portfolio not found`);
    }

    const clarisaLeverToUpdate: Partial<ClarisaLever> = {
      full_name: updateClarisaLeverDto?.full_name,
      other_names: updateClarisaLeverDto?.other_names,
      short_name: updateClarisaLeverDto?.short_name,
      portfolio_id: updateClarisaLeverDto.portfolio_id,
      ...this.currentUser.audit(SetAuditEnum.UPDATE),
    };

    await this.mainRepo.update(id, clarisaLeverToUpdate);
    return this.mainRepo.findOne({ where: { id } });
  }

  async remove(id: number): Promise<number> {
    const clarisaLever = await this.mainRepo.findOne({ where: { id } });
    if (!clarisaLever) {
      throw new BadRequestException(`Clarisa lever not found`);
    }
    const response = await this.mainRepo.update(id, { is_active: false });
    if (response.affected === 0) {
      throw new BadRequestException(`Clarisa lever not found`);
    }
    return id;
  }

  iconMapper(clarisaLever: ClarisaLever[]) {
    return clarisaLever.map((lever) => ({
      ...lever,
      icon: this.resolveIconUrl(lever.short_name, lever.full_name, lever.id),
    }));
  }

  async findByShortName(shortName: string): Promise<ClarisaLever> {
    return this.mainRepo.findOne({
      where: {
        short_name: shortName,
      },
    });
  }

  homologatedData(data: string): string {
    const homologated = {
      L8: 'Lever 8',
      L7: 'Lever 7',
      L6: 'Lever 6',
      L5: 'Lever 5',
      L4: 'Lever 4',
      L3: 'Lever 3',
      L2: 'Lever 2',
      L1: 'Lever 1',
    };
    return homologated[data?.toUpperCase()?.trim()] ?? null;
  }
}
