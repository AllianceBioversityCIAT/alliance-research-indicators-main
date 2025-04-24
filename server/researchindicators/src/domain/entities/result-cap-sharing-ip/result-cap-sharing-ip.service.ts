import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultCapSharingIp } from './entities/result-cap-sharing-ip.entity';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { selectManager } from '../../shared/utils/orm.util';
import { UpdateResultCapSharingIpDto } from './dto/update-result-cap-sharing-ip.dto';

@Injectable()
export class ResultCapSharingIpService {
  private readonly mainRepo: Repository<ResultCapSharingIp>;
  constructor(
    dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
  ) {
    this.mainRepo = dataSource.getRepository(ResultCapSharingIp);
  }

  async create(resultId: number, manager?: EntityManager) {
    const entityManager: Repository<ResultCapSharingIp> = selectManager(
      manager,
      ResultCapSharingIp,
      this.mainRepo,
    );

    const response = await entityManager.save({
      result_cap_sharing_ip_id: resultId,
      ...this.currentUser.audit(SetAutitEnum.NEW),
    });

    return response;
  }

  async update(resultId: number, updateData: UpdateResultCapSharingIpDto) {
    await this.mainRepo.update(resultId, {
      asset_ip_owner_description: updateData.asset_ip_owner_description,
      publicity_restriction: updateData.publicity_restriction,
      requires_futher_development: updateData.requires_futher_development,
      asset_ip_owner_id: updateData.asset_ip_owner,
      potential_asset: updateData.potential_asset,
      ...this.currentUser.audit(SetAutitEnum.UPDATE),
    });

    return updateData;
  }

  async findByResultId(resultId: number) {
    return await this.mainRepo
      .findOneBy({
        result_cap_sharing_ip_id: resultId,
        is_active: true,
      })
      .then((result) => ({
        asset_ip_owner_description: result?.asset_ip_owner_description,
        publicity_restriction: result?.publicity_restriction,
        requires_futher_development: result?.requires_futher_development,
        asset_ip_owner: result?.asset_ip_owner_id,
        potential_asset: result?.potential_asset,
      }));
  }
}
