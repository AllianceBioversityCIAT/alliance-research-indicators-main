import { DataSource, Repository } from 'typeorm';
import { ClarisaInstitutionType } from '../entities/clarisa-institution-type.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ClarisaInstitutionTypesRepository extends Repository<ClarisaInstitutionType> {
  constructor(dataSource: DataSource) {
    super(ClarisaInstitutionType, dataSource.createEntityManager());
  }

  async findActiveWithNoChildren(): Promise<ClarisaInstitutionType[]> {
    return this.createQueryBuilder('institutionType')
      .leftJoinAndSelect('institutionType.children', 'children')
      .where('institutionType.is_active = :isActive', { isActive: true })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('child.code')
          .from(ClarisaInstitutionType, 'child')
          .where('child.parent_code = institutionType.code')
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      })
      .getMany();
  }
}
