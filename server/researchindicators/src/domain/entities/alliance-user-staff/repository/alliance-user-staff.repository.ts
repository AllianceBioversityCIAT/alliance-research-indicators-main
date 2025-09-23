import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { AllianceUserStaff } from '../entities/alliance-user-staff.entity';
import { ElasticFindEntity } from '../../../tools/open-search/dto/elastic-find-entity.dto';
import { FindAllOptions } from '../../../shared/enum/find-all-options';
import { AllianceStaffOpensearchDto } from '../../../tools/open-search/alliance-staff/dto/alliance-staff.opensearch.dto';

@Injectable()
export class AllianceUserStaffRepository
  extends Repository<AllianceUserStaff>
  implements ElasticFindEntity<AllianceStaffOpensearchDto>
{
  constructor(dataSource: DataSource) {
    super(AllianceUserStaff, dataSource.createEntityManager());
  }

  async findDataForOpenSearch(
    option: FindAllOptions,
    ids?: string[],
  ): Promise<AllianceStaffOpensearchDto[]> {
    const where: FindOptionsWhere<AllianceUserStaff> = {};
    if (option !== FindAllOptions.SHOW_ALL) where.is_active = true;
    if (ids && ids.length > 0) where.carnet = In(ids);
    return this.find({
      where,
    });
  }
}
