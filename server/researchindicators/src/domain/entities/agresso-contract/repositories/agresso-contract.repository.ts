import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AgressoContract } from '../entities/agresso-contract.entity';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { AlianceManagementApp } from '../../../tools/broker/aliance-management.app';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { ContractResultCountDto } from '../dto/contract-result-count.dto';
import { isEmpty } from '../../../shared/utils/object.utils';

@Injectable()
export class AgressoContractRepository extends Repository<AgressoContract> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
    private readonly alianceManagementApp: AlianceManagementApp,
  ) {
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

  async findContractsByUser(
    userId?: number,
  ): Promise<ContractResultCountDto[]> {
    const tempUserId = userId || this.currentUser.user_id;
    const contract = await this.alianceManagementApp.findUserToContract(
      tempUserId,
      SecRolesEnum.CONTRACT_CONTRIBUTOR,
    );

    if (!contract || contract.length === 0) {
      return [];
    }

    const contractIds = contract.map((c) => c.contract_id);

    const query = `
    SELECT 
      ac.agreement_id, 
      ac.projectDescription, 
      ac.project_lead_description, 
      ac.start_date, 
      ac.end_date, 
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'indicator', JSON_OBJECT(
            'indicator_id', i.indicator_id,
            'name', i.name,
            'description', i.description,
            'indicator_type_id', i.indicator_type_id,
            'long_description', i.long_description,
            'icon_src', i.icon_src,
            'other_names', i.other_names,
            'is_active', i.is_active
          ),
          'count_results', 
            (SELECT count(r.result_id)
            FROM results r
            INNER JOIN result_contracts rc ON rc.result_id = r.result_id
            WHERE rc.contract_id = ac.agreement_id
              AND r.indicator_id = i.indicator_id
              AND r.is_active = 1
              AND rc.is_active = 1)
        )
      ) AS indicators
    FROM agresso_contracts ac
    CROSS JOIN indicators i
    WHERE ac.agreement_id IN (?)
    GROUP BY ac.agreement_id;`;

    return this.query(query, [contractIds]) as Promise<
      ContractResultCountDto[]
    >;
  }

  async findOneContract(contract_id: string) {
    if (isEmpty(contract_id)) {
      return null;
    }

    const query = `
    SELECT 
      ac.agreement_id, 
      ac.projectDescription, 
      ac.project_lead_description, 
      ac.start_date, 
      ac.end_date, 
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'indicator', JSON_OBJECT(
            'indicator_id', i.indicator_id,
            'name', i.name,
            'description', i.description,
            'indicator_type_id', i.indicator_type_id,
            'long_description', i.long_description,
            'icon_src', i.icon_src,
            'other_names', i.other_names,
            'is_active', i.is_active
          ),
          'count_results', 
            (SELECT count(r.result_id)
            FROM results r
            INNER JOIN result_contracts rc ON rc.result_id = r.result_id
            WHERE rc.contract_id = ac.agreement_id
              AND r.indicator_id = i.indicator_id
              AND r.is_active = 1
              AND rc.is_active = 1)
        )
      ) AS indicators
    FROM agresso_contracts ac
    CROSS JOIN indicators i
    WHERE ac.agreement_id = ?
    GROUP BY ac.agreement_id;`;

    return (
      this.query(query, [contract_id]) as Promise<ContractResultCountDto[]>
    ).then((response) => (response.length > 0 ? response[0] : null));
  }
}
