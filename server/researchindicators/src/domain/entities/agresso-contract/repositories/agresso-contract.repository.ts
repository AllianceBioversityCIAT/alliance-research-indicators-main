import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AgressoContract } from '../entities/agresso-contract.entity';

@Injectable()
export class AgressoContractRepository extends Repository<AgressoContract> {
  constructor(private readonly dataSource: DataSource) {
    super(AgressoContract, dataSource.createEntityManager());
  }

  async findByName(first_name: string, last_name: string) {
    const processed_first_name = `${first_name.toUpperCase().replace(' ', '|')}`;
    const processed_last_name = `${last_name.toUpperCase().replace(' ', '|')}`;
    return this.createQueryBuilder('ac')
      .leftJoin(
        'user_agresso_contract',
        'uac',
        'ac.agreement_id = uac.agreement_id',
      )
      .where('ac.project_lead_description REGEXP :first_name', {
        first_name: processed_first_name,
      })
      .andWhere('ac.project_lead_description REGEXP :last_name', {
        last_name: processed_last_name,
      })

      .andWhere(
        '(ac.is_active = false OR uac.user_agresso_contract_id IS NULL)',
      )
      .getMany();
  }
}
