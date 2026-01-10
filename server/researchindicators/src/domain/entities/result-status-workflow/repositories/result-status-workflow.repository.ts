import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultStatusWorkflow } from '../entities/result-status-workflow.entity';
import { GeneralDataDto } from '../config/config-workflow';
import { FindDataForSubmissionDto } from '../../green-checks/dto/find-general-data-template.dto';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { transactionManager } from '../../../shared/utils/orm.util';
import { cleanName, cleanText } from '../../../shared/utils/object.utils';

@Injectable()
export class ResultStatusWorkflowRepository extends Repository<ResultStatusWorkflow> {
  constructor(
    private dataSource: DataSource,
    private readonly appConfig: AppConfig,
  ) {
    super(ResultStatusWorkflow, dataSource.createEntityManager());
  }

  async getDataForSubmissionResult(
    resultId: number,
    generalData: GeneralDataDto,
    manager: EntityManager,
  ): Promise<GeneralDataDto> {
    const entityManager = transactionManager(
      manager,
      this.dataSource.createEntityManager(),
    );
    const query = `
      select 
        su.sec_user_id as owner_id,
        su.first_name as owner_first_name,
        su.last_name as owner_last_name,
        su.email as owner_email,
        aus.first_name as principal_investigator_first_name,
        aus.last_name as principal_investigator_last_name,
        aus.email as principal_investigator_name,
        r.result_official_code,
        r.result_id,
        r.title as result_title,
        ac.description as project_name,
        i.name as indicator
      from results r 
        left join result_contracts rc on rc.result_id = r.result_id 
                        and rc.is_primary = true
                        and rc.is_active = true
        left join agresso_contracts ac on ac.agreement_id = rc.contract_id 
        left join alliance_user_staff aus on aus.carnet = ac.projectLeadId 
        left join sec_users su on su.sec_user_id = r.created_by
        inner join indicators i on i.indicator_id = r.indicator_id
      where r.is_active = true
        and r.result_id = ?
      limit 1;
    `;

    const resultData: FindDataForSubmissionDto = await entityManager
      .query(query, [resultId])
      .then((result) => (result?.length ? result[0] : null));

    generalData.customData.result_owner = {
      name: `${cleanName(resultData.owner_first_name)} ${cleanName(resultData.owner_last_name)}`,
      email: cleanText(resultData.owner_email),
    };
    generalData.customData.principal_investigator = {
      name: `${cleanName(resultData.principal_investigator_first_name)} ${cleanName(resultData.principal_investigator_last_name)}`,
      email: cleanText(resultData.principal_investigator_name),
    };
    generalData.customData.submitter = {
      name: generalData.customData.action_executor.name,
      email: generalData.customData.action_executor.email,
    };
    generalData.customData.title = resultData.result_title;
    generalData.customData.project_name = resultData.project_name;
    generalData.customData.indicator_name = resultData.indicator;
    generalData.customData.result_code = resultData.result_official_code;
    generalData.customData.result_id = resultData.result_id;
    generalData.customData.url = `${this.appConfig.ARI_CLIENT_HOST}/result/${resultData.result_official_code}/general-information`;

    return generalData;
  }
}
