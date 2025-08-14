import { Injectable } from '@nestjs/common';
import { ClarisaInstitutionsRepository } from './repositories/clarisa-institution.repository';
import { ClarisaPathEnum } from '../../anum/path.enum';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaInstitution } from './entities/clarisa-institution.entity';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { TrueFalseEnum } from '../../../../shared/enum/queries.enum';
import { FindOptionsWhere, Like } from 'typeorm';
@Injectable()
export class ClarisaInstitutionsService extends ControlListBaseService<
  ClarisaInstitution,
  ClarisaInstitutionsRepository
> {
  constructor(
    customRepo: ClarisaInstitutionsRepository,
    currentUser: CurrentUserUtil,
  ) {
    super(ClarisaInstitution, customRepo, currentUser, 'name');
  }

  async clonePath() {
    const date = await this.mainRepo.lastInsertDate();
    let path: string = `${ClarisaPathEnum.INSTITUTIONS}?show=all`;
    if (date) path += `&from=${date}`;
    return path;
  }

  async getInstitutionsByCountry(
    location?: string,
    isHeadquarter?: string,
    type?: string,
  ) {
    const query = this.mainRepo
      .createQueryBuilder('institution')
      .where('1=1')
      .orderBy('institution.code', 'ASC');

    if (location == TrueFalseEnum.TRUE) {
      query.leftJoinAndSelect(
        'institution.institution_locations',
        'institution_locations',
      );

      if (isHeadquarter == TrueFalseEnum.TRUE) {
        query.andWhere('institution_locations.isHeadquarter = :isHeadquarter', {
          isHeadquarter: true,
        });
      }
    }

    if (type == TrueFalseEnum.TRUE) {
      query.leftJoinAndSelect('institution.institution_type', 'type');
    }

    return query.getMany();
  }

  async findByLikeNames(names: string[]) {
    const where: FindOptionsWhere<ClarisaInstitution>[] = names.map((name) => ({
      is_active: true,
      [this.findByNameKey]: Like(`'%${name?.trim()}%'`),
    }));
    return this.mainRepo.find({
      where,
    });
  }
}
