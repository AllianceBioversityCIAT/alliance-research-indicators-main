import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectIndicatorsResult } from './entities/project_indicators_result.entity';
import { Repository } from 'typeorm';
import { SyncProjectIndicatorsResultDto } from './dto/sync-project_indicators_result.dto';


@Injectable()
export class ProjectIndicatorsResultsService {
  constructor(
    @InjectRepository(ProjectIndicatorsResult)
    private readonly indicatorsResultsRepo: Repository<ProjectIndicatorsResult>,
  ) {}

  async syncResultToIndicator(dto: SyncProjectIndicatorsResultDto): Promise<ProjectIndicatorsResult> {
    let contribution: ProjectIndicatorsResult;

    if (dto.id) {
      contribution = await this.indicatorsResultsRepo.findOne({ where: { id: dto.id } });
      console.log('Contribution found:', contribution);
      if (!contribution) {
        throw new Error('Contribution not found');
      }
      Object.assign(contribution, {
        result_id: {result_id: dto.result_id},
        indicator_id: {id: dto.indicator_id},
        contribution_value: dto.contribution_value
      });
    } else {
      contribution = this.indicatorsResultsRepo.create({
        result_id: {result_id: dto.result_id},
        indicator_id: {id: dto.indicator_id},
        contribution_value: dto.contribution_value
      });
    }

    return await this.indicatorsResultsRepo.save(contribution);
  }

  async findByResultId(resultId: number): Promise<ProjectIndicatorsResult[]> {
    const rows = await this.indicatorsResultsRepo
      .createQueryBuilder('pir')
      .leftJoinAndSelect('pir.indicator_id', 'pi', 'pi.is_active = true')
      .leftJoinAndSelect('pir.result_id', 'r', 'r.is_active = true')
      .select([
        'pir.id AS id_contribution',
        'CASE WHEN pir.contribution_value = FLOOR(pir.contribution_value) THEN CAST(pir.contribution_value AS SIGNED) ELSE ROUND(pir.contribution_value, 2) END AS contribution_value',
        'pir.result_id AS result_id',
        'r.result_official_code AS result_official_code',
        'r.description AS result_description',
        'pir.indicator_id AS indicator_id',
        'pi.name AS indicator_name',
        'pi.code AS indicator_code',
        'pi.description AS indicator_description',
        'pi.number_type AS indicator_number_type',
        'pi.number_format AS indicator_number_format',
        'pi.target_unit AS indicator_target_unit',
        'CASE WHEN pi.target_value = FLOOR(pi.target_value) THEN CAST(pi.target_value AS SIGNED) ELSE ROUND(pi.target_value, 2) END AS indicator_target_value',
        'CASE WHEN pi.base_line = FLOOR(pi.base_line) THEN CAST(pi.base_line AS SIGNED) ELSE ROUND(pi.base_line, 2) END AS indicator_base_line',
        'pi.year AS indicator_year',
        'pi.type AS indicator_type',
      ])
      .where('pir.result_id = :resultId', { resultId })
      .getRawMany();
    return rows;
  }
}
