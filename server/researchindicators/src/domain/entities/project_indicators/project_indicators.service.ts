import { Injectable } from '@nestjs/common';
import { ProjectIndicator } from './entities/project_indicator.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProjectIndicatorDto } from './dto/create-project_indicator.dto';

@Injectable()
export class ProjectIndicatorsService {
  constructor(
    @InjectRepository(ProjectIndicator)
    private readonly indicatorRepository: Repository<ProjectIndicator>,
  ) {}

  async findAll(agreement_id: string): Promise<CreateProjectIndicatorDto[]> {
    const indicators = await this.indicatorRepository
      .createQueryBuilder('pi')
      .select([
        'pi.id as id',
        'pi.code as code',
        'pi.name as name',
        'pi.description as description',
        'pi.number_type as number_type',
        'pi.number_format as number_format',
        'pi.target_unit as target_unit',
        'pi.year as year',
      ])
      .addSelect(
        'CASE WHEN pi.target_value = FLOOR(pi.target_value) THEN CAST(pi.target_value AS SIGNED) ELSE ROUND(pi.target_value, 2) END',
        'target_value'
      )
      .addSelect(
        'CASE WHEN pi.base_line = FLOOR(pi.base_line) THEN CAST(pi.base_line AS SIGNED) ELSE ROUND(pi.base_line, 2) END',
        'base_line'
      )
      .where('pi.is_active = true')
      .andWhere('pi.agreement_id = :agreement_id', { agreement_id })
      .getRawMany();

    return indicators.map((pi) => ({
      id: pi.id,
      code: pi.code,
      name: pi.name,
      description: pi.description,
      numberType: pi.number_type,
      numberFormat: pi.number_format,
      targetUnit: pi.target_unit,
      targetValue: pi.target_value,
      baseline: pi.base_line,
      years: pi.year ?? [],
    })) as CreateProjectIndicatorDto[];
  }

  async syncIndicator(dto: CreateProjectIndicatorDto): Promise<ProjectIndicator> {
    let indicator: ProjectIndicator;

    if (dto.id) {
      indicator = await this.indicatorRepository.findOne({ where: { id: dto.id } });
      if (!indicator) {
        throw new Error(`Indicator with id ${dto.id} not found`);
      }
      Object.assign(indicator, {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        number_type: dto.numberType as any,
        number_format: dto.numberFormat as any,
        target_unit: dto.targetUnit,
        target_value: dto.targetValue,
        base_line: dto.baseline,
        year: dto.years,
        agreement_id: dto.agreement_id,
      });
    } else {
      indicator = this.indicatorRepository.create({
        code: dto.code,
        name: dto.name,
        description: dto.description,
        number_type: dto.numberType as any,
        number_format: dto.numberFormat as any,
        target_unit: dto.targetUnit,
        target_value: dto.targetValue,
        base_line: dto.baseline,
        year: dto.years,
        agreement_id: dto.agreement_id,
      });
    }

    return await this.indicatorRepository.save(indicator);
  }

  async softDelete(id: number) {
    return await this.indicatorRepository.update(id, { 
      deleted_at: new Date(),
      is_active: false
    });
  }
}
