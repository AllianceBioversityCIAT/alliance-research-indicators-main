import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { LinkResult } from './entities/link-result.entity';
import { DataSource, Repository } from 'typeorm';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';

@Injectable()
export class LinkResultsService extends BaseServiceSimple<
  LinkResult,
  Repository<LinkResult>
> {
  constructor(dataSource: DataSource) {
    super(
      LinkResult,
      dataSource.getRepository(LinkResult),
      'result_id',
      'link_result_role_id',
    );
  }

  async findAndDetails(result_id: number, role_id: LinkResultRolesEnum) {
    return this.mainRepo.find({
      where: { result_id, link_result_role_id: role_id, is_active: true },
      relations: {
        other_result: true,
      },
    });
  }
}
