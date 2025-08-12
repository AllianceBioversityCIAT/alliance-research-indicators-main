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
  
  async findAll(): Promise<CreateProjectIndicatorDto[]> {
    const indicators = await this.indicatorRepository
      .createQueryBuilder('pi')
      .select([
        'pi.id',
        'pi.code',
        'pi.name',
        'pi.description',
        'pi.number_type',
        'pi.number_format',
        'pi.target_unit',
        'pi.target_value',
        'pi.base_line',
        'pi.year',
      ])
      .getMany();

    return indicators.map((pi) => ({
      id: String(pi.code ?? pi.id), // usas code si está, sino el id
      name: pi.name,
      description: pi.description,
      numberType: pi.number_type,
      numberFormat: pi.number_format,
      targetUnit: pi.target_unit,
      targetValue: pi.target_value,
      baseline: pi.base_line,
      years: pi.year ?? [],
      // `level` no está en la entidad, así que no lo devolvemos o lo dejamos en null
      level: null,
    })) as CreateProjectIndicatorDto[];
  }

  async create(dto: CreateProjectIndicatorDto): Promise<ProjectIndicator> {
    const newIndicator = this.indicatorRepository.create({
      id: Number(dto.id),
      code: dto.id,
      name: dto.name,
      description: dto.description,
      number_type: dto.numberType as any,
      number_format: dto.numberFormat as any,
      target_unit: dto.targetUnit,
      target_value: dto.targetValue,
      base_line: dto.baseline,
      year: dto.years,
    });

    return await this.indicatorRepository.save(newIndicator);
  }

}
