import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultStatusWorkflow } from '../entities/result-status-workflow.entity';
import { GeneralDataDto } from '../config/config-workflow';
import { FindGeneralCustomDataDto } from '../../green-checks/dto/find-general-data-template.dto';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { transactionManager } from '../../../shared/utils/orm.util';
import {
  cleanName,
  cleanText,
  isEmpty,
} from '../../../shared/utils/object.utils';
import { Result } from '../../results/entities/result.entity';

@Injectable()
export class ResultStatusWorkflowRepository extends Repository<ResultStatusWorkflow> {
  constructor(
    private dataSource: DataSource,
    private readonly appConfig: AppConfig,
  ) {
    super(ResultStatusWorkflow, dataSource.createEntityManager());
  }

  async getOicrGeneralData(
    resultId: number,
    generalData: GeneralDataDto,
    manager: EntityManager,
  ) {
    const entityManager = transactionManager(
      manager,
      this.dataSource.createEntityManager(),
    );
    const query = this.getGeneralQuery({
      select: `ro.oicr_internal_code,
                ro.sharepoint_link,
                aus2.first_name as mel_regional_expert_first_name,
                aus2.last_name as mel_regional_expert_last_name,
                aus2.email as mel_regional_expert_email`,
      join: `inner join result_oicrs ro on ro.result_id = r.result_id and ro.is_active = true
             left join alliance_user_staff aus2 on aus2.carnet = ro.mel_regional_expert `,
    });

    const resultData: FindGeneralCustomDataDto = await entityManager
      .query(query, [resultId])
      .then((result) => (result?.length ? result[0] : null));

    this.setCustomGeneralData(generalData, resultData);
    generalData.customData.oicr_internal_code = resultData?.oicr_internal_code;
    generalData.customData.sharepoint_url = resultData?.sharepoint_link;
    generalData.customData.download_url = 'COMING SOON';
    generalData.customData.regional_expert = {
      name: `${cleanName(resultData.mel_regional_expert_first_name)} ${cleanName(resultData.mel_regional_expert_last_name)}`,
      email: cleanText(resultData.mel_regional_expert_email),
    };
    return generalData;
  }

  getGeneralQuery(config?: GeneralQueryUpdate): string {
    return `
      select 
        su.sec_user_id as owner_id,
        su.first_name as owner_first_name,
        su.last_name as owner_last_name,
        su.email as owner_email,
        aus.first_name as principal_investigator_first_name,
        aus.last_name as principal_investigator_last_name,
        aus.email as principal_investigator_email,
        r.result_official_code,
        r.result_id,
        r.title as result_title,
        DATE_FORMAT(r.created_at , '%d/%m/%Y') as created_at,
        ac.description as project_name,
        ac.agreement_id as project_code,
        i.name as indicator
        ${isEmpty(config?.select) ? '' : `,${config.select}`}
      from results r 
        left join result_contracts rc on rc.result_id = r.result_id 
                        and rc.is_primary = true
                        and rc.is_active = true
        left join agresso_contracts ac on ac.agreement_id = rc.contract_id 
        left join alliance_user_staff aus on aus.carnet = ac.projectLeadId 
        left join sec_users su on su.sec_user_id = r.created_by
        inner join indicators i on i.indicator_id = r.indicator_id
        ${isEmpty(config?.join) ? '' : `${config.join}`}
      where r.is_active = true
        and r.result_id = ?
        ${isEmpty(config?.where) ? '' : `and ${config.where}`}
      ${isEmpty(config?.order) ? '' : `order by ${config.order}`}
      limit 1;
    `;
  }

  async getDataForRevisionResult(
    resultId: number,
    generalData: GeneralDataDto,
    manager: EntityManager,
  ) {
    const entityManager = transactionManager(
      manager,
      this.dataSource.createEntityManager(),
    );

    const query = this.getGeneralQuery({
      select: `su2.first_name as action_executor_first_name,
        su2.last_name as action_executor_last_name,
        su2.email as action_executor_email,
        sh.submission_comment as description`,
      join: `inner join submission_history sh on sh.result_id = r.result_id 
        								and sh.is_active = true
        left join sec_users su2 on su2.sec_user_id = sh.created_by `,
      where: 'sh.from_status_id = 4 and sh.to_status_id = 2',
      order: 'sh.created_at DESC',
    });

    const resultData: FindGeneralCustomDataDto = await entityManager
      .query(query, [resultId])
      .then((result) => (result?.length ? result[0] : null));

    this.setCustomGeneralData(generalData, resultData);

    generalData.customData.submitter = {
      name: `${cleanName(resultData.action_executor_first_name)} ${cleanName(resultData.action_executor_last_name)}`,
      email: cleanText(resultData.action_executor_email),
    };

    generalData.customData.description =
      generalData?.aditionalData?.submission_comment;

    return generalData;
  }

  async createSnapshot(generalData: GeneralDataDto, manager: EntityManager) {
    const entityManager = transactionManager(
      manager,
      this.dataSource.createEntityManager(),
    );

    const deleteQuery = `CALL SP_delete_result_version(?, ?)`;
    const snapshotResult = await entityManager.getRepository(Result).findOne({
      where: {
        is_snapshot: true,
        result_official_code: generalData.result.result_official_code,
        report_year_id: generalData.result.report_year_id,
      },
    });

    if (snapshotResult) {
      await entityManager
        .query(deleteQuery, [
          generalData.result.result_official_code,
          generalData.result.report_year_id,
        ])
        .catch(() => {
          throw new Error('Error deleting snapshot');
        });
    }

    const query = `CALL SP_versioning(?);`;
    return entityManager
      .query<Result>(query, [generalData.result.result_official_code])
      .catch(() => {
        throw new Error('Error creating snapshot');
      });
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
    const query = this.getGeneralQuery();

    const resultData: FindGeneralCustomDataDto = await entityManager
      .query(query, [resultId])
      .then((result) => (result?.length ? result[0] : null));

    generalData.customData.submitter = {
      name: generalData.customData.action_executor.name,
      email: generalData.customData.action_executor.email,
    };

    this.setCustomGeneralData(generalData, resultData);
    return generalData;
  }

  setCustomGeneralData(
    generalData: GeneralDataDto,
    customData: FindGeneralCustomDataDto,
  ) {
    generalData.customData.result_owner = {
      name: `${cleanName(customData.owner_first_name)} ${cleanName(customData.owner_last_name)}`,
      email: cleanText(customData.owner_email),
    };
    generalData.customData.principal_investigator = {
      name: `${cleanName(customData.principal_investigator_first_name)} ${cleanName(customData.principal_investigator_last_name)}`,
      email: cleanText(customData.principal_investigator_email),
    };
    generalData.customData.contract = {
      code: customData.project_code,
      title: customData.project_name,
    };
    generalData.customData.title = customData.result_title;
    generalData.customData.indicator_name = customData.indicator;
    generalData.customData.result_code = customData.result_official_code;
    generalData.customData.result_id = customData.result_id;
    generalData.customData.platform_code = this.appConfig.ARI_MIS;
    generalData.customData.created_at = customData.created_at;
    generalData.customData.url = `${this.appConfig.ARI_CLIENT_HOST}/result/${customData.result_official_code}/general-information`;
    return generalData;
  }
}

export class GeneralQueryUpdate {
  select?: string;
  where?: string;
  join?: string;
  order?: string;
}
