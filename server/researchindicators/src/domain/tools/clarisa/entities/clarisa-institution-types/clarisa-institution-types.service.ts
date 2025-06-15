import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaInstitutionType } from './entities/clarisa-institution-type.entity';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { ClarisaInstitutionTypesRepository } from './repositories/clarisa-institution-types.repository';
import { getItemsAtLevel } from '../../../../shared/utils/array.util';
@Injectable()
export class ClarisaInstitutionTypesService extends ControlListBaseService<
  ClarisaInstitutionType,
  ClarisaInstitutionTypesRepository
> {
  constructor(
    currentUser: CurrentUserUtil,
    clarisaInstitutionTypesRepository: ClarisaInstitutionTypesRepository,
  ) {
    super(
      ClarisaInstitutionType,
      clarisaInstitutionTypesRepository,
      currentUser,
    );
  }

  async findInstitutionTypeToPartner() {
    return this.mainRepo.findActiveWithNoChildren();
  }

  async getChildlessInstitutionTypes() {
    const institutionsType = await this.mainRepo.find({
      where: { is_active: true },
      relations: { children: true },
    });

    return institutionsType
      .filter((el) => !el.children.length)
      .map((el) => {
        delete el.children;
        return el;
      });
  }

  async getInstitutionTypesByDepthLevel(level: number) {
    const institutionTypes = await this.mainRepo.find({
      where: { is_active: true },
      relations: {
        children: {
          children: true,
        },
      },
    });

    return getItemsAtLevel<ClarisaInstitutionType>(institutionTypes, level);
  }
}
