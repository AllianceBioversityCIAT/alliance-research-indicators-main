import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { ResultPoolFundingIndicatorMapping } from '../entities/result-pool-funding-indicator-mapping.entity';

export type PoolFundingIndicatorMappingDetail = Pick<
  ResultPoolFundingIndicatorMapping,
  | 'id'
  | 'result_id'
  | 'lever_code'
  | 'indicator_code'
  | 'indicator_type'
  | 'result_capacity_sharing_id'
  | 'result_knowledge_product_id'
  | 'result_policy_change_id'
  | 'result_innovation_dev_id'
  | 'other_contribution_narrative'
  | 'is_stale'
>;

@Injectable()
export class ResultPoolFundingIndicatorMappingRepository extends Repository<ResultPoolFundingIndicatorMapping> {
  constructor(dataSource: DataSource) {
    super(ResultPoolFundingIndicatorMapping, dataSource.createEntityManager());
  }

  findActiveMappingByResultLeverIndicator(
    resultId: number,
    leverCode: string,
    indicatorCode: string,
  ): Promise<PoolFundingIndicatorMappingDetail | null> {
    return this.findOne({
      where: {
        result_id: resultId,
        lever_code: leverCode,
        indicator_code: indicatorCode,
        is_active: true,
      },
      select: {
        id: true,
        result_id: true,
        lever_code: true,
        indicator_code: true,
        indicator_type: true,
        result_capacity_sharing_id: true,
        result_knowledge_product_id: true,
        result_policy_change_id: true,
        result_innovation_dev_id: true,
        other_contribution_narrative: true,
        is_stale: true,
      },
    });
  }

  findActiveStaleMappingsByResultAndLevers(
    resultId: number,
    leverCodes: string[],
  ): Promise<PoolFundingIndicatorMappingDetail[]> {
    if (!leverCodes.length) {
      return Promise.resolve([]);
    }

    return this.find({
      where: {
        result_id: resultId,
        lever_code: In(leverCodes),
        is_active: true,
        is_stale: true,
      },
      select: {
        id: true,
        result_id: true,
        lever_code: true,
        indicator_code: true,
        indicator_type: true,
        result_capacity_sharing_id: true,
        result_knowledge_product_id: true,
        result_policy_change_id: true,
        result_innovation_dev_id: true,
        other_contribution_narrative: true,
        is_stale: true,
      },
      order: {
        lever_code: 'ASC',
        indicator_code: 'ASC',
      },
    });
  }

  async markActiveMappingsStaleByLeverIndicator(
    leverCode: string,
    indicatorCode: string,
    actorUserId?: number,
  ): Promise<number> {
    const updatePayload: Partial<ResultPoolFundingIndicatorMapping> = {
      is_stale: true,
    };

    if (actorUserId) {
      updatePayload.updated_by = actorUserId;
    }

    const result = await this.update(
      {
        lever_code: leverCode,
        indicator_code: indicatorCode,
        is_active: true,
        is_stale: false,
      },
      updatePayload,
    );

    return result.affected ?? 0;
  }
}
