import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Template } from '../../shared/auxiliar/template/entities/template.entity';
import { TemplateEnum } from '../../shared/auxiliar/template/enum/template.enum';
import { ResultStatusWorkflow } from './entities/result-status-workflow.entity';
import { ResultsUtil } from '../../shared/utils/results.util';
import { isEmpty } from '../../shared/utils/object.utils';
import { Result } from '../results/entities/result.entity';
import { ResultStatus } from '../result-status/entities/result-status.entity';

@Injectable()
export class ResultStatusWorkflowService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly currentResult: ResultsUtil,
  ) {}

  private async getTemplate(template: TemplateEnum): Promise<string> {
    return this.dataSource
      .getRepository(Template)
      .findOne({
        where: {
          name: template,
          is_active: true,
        },
      })
      .then((res) => res.template);
  }

  private async getStatusesByIds(statusIds: number[]) {
    return this.dataSource.getRepository(ResultStatus).find({
      where: {
        result_status_id: In(statusIds),
        is_active: true,
      },
    });
  }

  async getAllStatusesByindicatorId(indicatorId: number) {
    return this.dataSource.getRepository(ResultStatusWorkflow).find({
      where: {
        indicator_id: indicatorId,
        is_active: true,
      },
      relations: {
        from_status: true,
        to_status: true,
      },
    });
  }

  async getConfigWorkflowByIndicatorAndFromStatus(
    indicatorId: number,
    fromStatusId: number,
    showOnlyWorkflow: boolean = false,
  ) {
    const statuses = await this.dataSource
      .getRepository(ResultStatusWorkflow)
      .find({
        where: {
          indicator_id: indicatorId,
          is_active: true,
          from_status_id: fromStatusId,
        },
      });

    if (showOnlyWorkflow) return statuses;

    return this.getStatusesByIds(statuses.map((el) => el.to_status_id));
  }

  async getNextStepsByResultId(resultId: number) {
    let indicatorId: number, currentStatusId: number;
    if (isEmpty(this.currentResult?.nullResultId)) {
      await this.dataSource
        .getRepository(Result)
        .findOne({
          where: {
            result_id: resultId,
            is_active: true,
          },
          select: {
            indicator_id: true,
            result_status_id: true,
          },
        })
        .then((result) => {
          indicatorId = result.indicator_id;
          currentStatusId = result.result_status_id;
        });
    } else {
      indicatorId = this.currentResult.indicatorId;
      currentStatusId = this.currentResult.statusId;
    }
    return this.getConfigWorkflowByIndicatorAndFromStatus(
      indicatorId,
      currentStatusId,
    );
  }
}
