import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaInnovationUseLevel } from './entities/clarisa-innovation-use-level.entity';
import {
  DataSource,
  FindOptionsRelations,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

@Injectable()
export class ClarisaInnovationUseLevelsService extends ControlListBaseService<
  ClarisaInnovationUseLevel,
  Repository<ClarisaInnovationUseLevel>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      ClarisaInnovationUseLevel,
      dataSource.getRepository(ClarisaInnovationUseLevel),
      currentUser,
      'name',
    );
  }

  /**
   * T-01 (R-IUA-010 AC.3, AC.4; design.md DD-6, §5.6) — override to carry an
   * explicit order clause. `ControlListBaseService.findAll()` issues none,
   * and on the seeded catalog `id = level + 1`, so default primary-key
   * ordering is only *coincidentally* correct today. Do not rely on that
   * coincidence — order by `level` explicitly so a future re-seed cannot
   * silently invert the scale (R-IUA-010's "Scale order does not rest on a
   * coincidence" scenario).
   */
  async findAll(
    relations: FindOptionsRelations<ClarisaInnovationUseLevel> = {},
    where?: FindOptionsWhere<ClarisaInnovationUseLevel>,
  ): Promise<ClarisaInnovationUseLevel[]> {
    let customWhere: FindOptionsWhere<ClarisaInnovationUseLevel> = {};
    if (where) {
      customWhere = {
        ...where,
      } as FindOptionsWhere<ClarisaInnovationUseLevel>;
    } else {
      customWhere = {
        is_active: true,
      } as FindOptionsWhere<ClarisaInnovationUseLevel>;
    }

    return this.mainRepo.find({
      where: customWhere,
      relations,
      order: { level: 'ASC' },
    });
  }
}
