import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaInstitution } from '../entities/clarisa-institution.entity';

@Injectable()
export class ClarisaInstitutionsRepository extends Repository<ClarisaInstitution> {
  constructor(dataSource: DataSource) {
    super(ClarisaInstitution, dataSource.createEntityManager());
  }

  async lastInsertDate(): Promise<number> {
    const createdAt = await this.findOne({
      select: ['updated_at'],
      where: { is_active: true },
      order: { created_at: 'DESC' },
    }).then((result) => result?.created_at);

    const updatedAt = await this.findOne({
      select: ['updated_at'],
      where: { is_active: true },
      order: { updated_at: 'DESC' },
    }).then((result) => result?.updated_at);

    const latestDate: Date = updatedAt || createdAt;
    const baseMilliseconds: number = 1000;
    const dateNumber: number = Math.round(
      new Date(latestDate).getTime() / baseMilliseconds,
    );
    return latestDate ? dateNumber : null;
  }
}
