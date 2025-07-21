import { Injectable } from '@nestjs/common';
import { UpdateIpRightDto } from './dto/update-ip-right.dto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultIpRight } from './entities/result-ip-right.entity';
import { selectManager } from '../../shared/utils/orm.util';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ResultsUtil } from '../../shared/utils/results.util';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class ResultIpRightsService {
  private readonly mainRepo: Repository<ResultIpRight>;
  constructor(
    dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
    private readonly _resultsUtil: ResultsUtil,
    private readonly _updateDataUtil: UpdateDataUtil,
  ) {
    this.mainRepo = dataSource.getRepository(ResultIpRight);
  }
  async create(resultId: number, manager?: EntityManager) {
    const entityManager: Repository<ResultIpRight> = selectManager(
      manager,
      ResultIpRight,
      this.mainRepo,
    );

    const response = await entityManager.save({
      result_cap_sharing_ip_id: resultId,
      ...this.currentUser.audit(SetAutitEnum.NEW),
    });

    return response;
  }

  async update(resultId: number, updateData: UpdateIpRightDto) {
    const saveData: QueryDeepPartialEntity<ResultIpRight> = {
      asset_ip_owner_description: updateData.asset_ip_owner_description,
      publicity_restriction: updateData.publicity_restriction,
      requires_futher_development: updateData.requires_futher_development,
      asset_ip_owner_id: updateData.asset_ip_owner,
      potential_asset: updateData.potential_asset,
      publicity_restriction_description:
        updateData.publicity_restriction_description,
      requires_futher_development_description:
        updateData.requires_futher_development_description,
      potential_asset_description: updateData.potential_asset_description,
      private_sector_engagement_id: null,
      formal_ip_rights_application_id: null,
      ...this.currentUser.audit(SetAutitEnum.UPDATE),
    };

    if (
      this._resultsUtil.result.indicator_id == IndicatorsEnum.INNOVATION_DEV
    ) {
      saveData.private_sector_engagement_id =
        updateData?.private_sector_engagement_id;
      saveData.formal_ip_rights_application_id =
        updateData?.formal_ip_rights_application_id;
    }

    await this.mainRepo.update(resultId, saveData);

    await this._updateDataUtil.updateLastUpdatedDate(resultId);

    return updateData;
  }

  async findByResultId(resultId: number) {
    return await this.mainRepo
      .findOneBy({
        result_ip_rights_id: resultId,
        is_active: true,
      })
      .then((result) => {
        const response: UpdateIpRightDto = {
          asset_ip_owner_description: result?.asset_ip_owner_description,
          publicity_restriction: result?.publicity_restriction,
          requires_futher_development: result?.requires_futher_development,
          asset_ip_owner: result?.asset_ip_owner_id,
          potential_asset: result?.potential_asset,
          potential_asset_description: result?.potential_asset_description,
          publicity_restriction_description:
            result?.publicity_restriction_description,
          requires_futher_development_description:
            result?.requires_futher_development_description,
          private_sector_engagement_id: null,
          formal_ip_rights_application_id: null,
        };

        if (
          this._resultsUtil.result.indicator_id == IndicatorsEnum.INNOVATION_DEV
        ) {
          response.private_sector_engagement_id =
            result?.private_sector_engagement_id;
          response.formal_ip_rights_application_id =
            result?.formal_ip_rights_application_id;
        }

        return response;
      });
  }
}
