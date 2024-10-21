import { Injectable } from '@nestjs/common';
import { ClarisaInstitutionsRepository } from './repositories/clarisa-institution.repository';
import { ClarisaPathEnum } from '../../anum/path.enum';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaInstitution } from './entities/clarisa-institution.entity';
@Injectable()
export class ClarisaInstitutionsService extends ControlListBaseService<
  ClarisaInstitution,
  ClarisaInstitutionsRepository
> {
  constructor(customRepo: ClarisaInstitutionsRepository) {
    super(ClarisaInstitution, customRepo);
  }

  async clonePath() {
    const date = await this.mainRepo.lastInsertDate();
    let path: string = `${ClarisaPathEnum.INSTITUTIONS}?show=all`;
    if (date) path += `&from=${date}`;
    return path;
  }
}
