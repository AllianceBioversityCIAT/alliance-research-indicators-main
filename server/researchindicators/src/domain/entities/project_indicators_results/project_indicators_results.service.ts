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
        'pir.indicator_id AS indicator_id',
      ])
      .where('pir.result_id = :resultId', { resultId })
      .getRawMany();
    return rows;
  }
}
