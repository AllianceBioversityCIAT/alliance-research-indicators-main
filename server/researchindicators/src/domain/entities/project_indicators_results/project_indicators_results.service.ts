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


}
