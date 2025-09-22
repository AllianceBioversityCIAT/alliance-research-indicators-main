import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaLanguage } from './entities/clarisa-language.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
@Injectable()
export class ClarisaLanguagesService extends ControlListBaseService<
  ClarisaLanguage,
  Repository<ClarisaLanguage>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ClarisaLanguage,
      dataSource.getRepository(ClarisaLanguage),
      currentUser,
    );
  }

  async findOneByiso3(iso3: string) {
    return this.mainRepo.findOne({
      where: {
        iso_alpha_3: iso3,
      },
    });
  }
}
