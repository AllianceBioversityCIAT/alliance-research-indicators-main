import { Injectable } from '@nestjs/common';
import { ClarisaInstitutionsRepository } from './repositories/clarisa-institution.repository';
import { ClarisaPathEnum } from '../../anum/path.enum';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaInstitution } from './entities/clarisa-institution.entity';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
@Injectable()
export class ClarisaInstitutionsService extends ControlListBaseService<
  ClarisaInstitution,
  ClarisaInstitutionsRepository
> {
  constructor(
    customRepo: ClarisaInstitutionsRepository,
    currentUser: CurrentUserUtil,
  ) {
    super(ClarisaInstitution, customRepo, currentUser);
  }

  async clonePath() {
    const date = await this.mainRepo.lastInsertDate();
    let path: string = `${ClarisaPathEnum.INSTITUTIONS}?show=all`;
    if (date) path += `&from=${date}`;
    return path;
  }

  async getInstitutionsByCountry(isHeadquarter?: string) {
    const query = this.mainRepo
      .createQueryBuilder('institution')
      .leftJoinAndSelect(
        'institution.institution_locations',
        'institution_locations',
      )
      .where('1=1')
      .orderBy('institution.code', 'ASC');

    if (isHeadquarter == 'true') {
      query.andWhere('institution_locations.isHeadquarter = :isHeadquarter', {
        isHeadquarter: true,
      });
    }

    return query.getMany();
  }
}
