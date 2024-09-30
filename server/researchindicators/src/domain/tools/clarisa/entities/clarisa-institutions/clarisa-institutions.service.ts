import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClarisaInstitutionsRepository } from './repositories/clarisa-institution.repository';
import { ClarisaPathEnum } from '../../anum/path.enum';
@Injectable()
export class ClarisaInstitutionsService {
  constructor(
    private readonly mainRepo: ClarisaInstitutionsRepository,
    private dataSource: DataSource,
  ) {}

  async clonePath() {
    const date = await this.mainRepo.lastInsertDate();
    let path: string = `${ClarisaPathEnum.INSTITUTIONS}?show=all`;
    if (date) path += `&from=${date}`;
    return path;
  }
}
