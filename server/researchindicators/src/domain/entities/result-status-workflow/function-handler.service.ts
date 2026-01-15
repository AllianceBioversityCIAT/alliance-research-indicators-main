import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource, EntityManager, Not } from 'typeorm';
import { Template } from '../../shared/auxiliar/template/entities/template.entity';
import { GeneralDataDto } from './config/config-workflow';
import { ResultStatusWorkflowRepository } from './repositories/result-status-workflow.repository';
import { transactionManager } from '../../shared/utils/orm.util';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { AppConfig } from '../../shared/utils/app-config.util';
import { GreenCheckRepository } from '../green-checks/repository/green-checks.repository';
import { isEmpty } from '../../shared/utils/object.utils';
import { ResultOicr } from '../result-oicr/entities/result-oicr.entity';
import { StaffGroupsEnum } from '../staff-groups/enum/staff-groups.enum';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

@Injectable()
export class StatusWorkflowFunctionHandlerService {
  protected readonly mainRepo: ResultStatusWorkflowRepository;
  constructor(
    private readonly dataSource: DataSource,
    resultStatusWorkflowRepository: ResultStatusWorkflowRepository,
    private readonly messageMicroservice: MessageMicroservice,
    private readonly appConfig: AppConfig,
    private readonly greenCheckRepository: GreenCheckRepository,
    private readonly currentUser: CurrentUserUtil,
    private readonly updateDataUtil: UpdateDataUtil,
  ) {
    this.mainRepo = resultStatusWorkflowRepository;
  }

  async getTemplate(
    generalData: GeneralDataDto,
    manager: EntityManager,
  ): Promise<string> {
    return manager
      .getRepository(Template)
      .findOne({
        where: {
          name: generalData.configEmail.templateCode,
          is_active: true,
        },
      })
      .then(({ template }) => template);
  }

  async sendEmail(generalData: GeneralDataDto, _manager: EntityManager) {
    await this.messageMicroservice.sendEmail({
      to: generalData.configEmail.to,
      cc: generalData.configEmail.cc,
      bcc: this.appConfig.INTERNAL_EMAIL_LIST_ARRAY,
      subject: generalData.configEmail.subject,
      message: {
        socketFile: Buffer.from(generalData.configEmail.body),
      },
    });
  }

  async createSnapshot(generalData: GeneralDataDto, manager: EntityManager) {
    await this.mainRepo.createSnapshot(generalData, manager);
  }

  async submittedConfigEmail(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    generalData.configEmail.to = [
      generalData.customData.principal_investigator.email,
    ];

    let ccEmails: string[] = [];

    if (
      generalData.customData.submitter.email ==
      generalData.customData.result_owner.email
    ) {
      ccEmails.push(generalData.customData.result_owner.email);
    } else {
      ccEmails.push(
        generalData.customData.submitter.email,
        generalData.customData.result_owner.email,
      );
    }

    ccEmails = ccEmails.filter(
      (email) => !generalData.configEmail.to.includes(email),
    );

    generalData.configEmail.cc = ccEmails;
    generalData.configEmail.subject = `[${this.appConfig.ARI_MIS}] Result ${generalData.customData.result_code} Action required: Review new result submission`;
  }

  async revisionConfigEmail(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    await this.generalRevisionConfigEmail(generalData, _manager);
    generalData.configEmail.subject = `[${this.appConfig.ARI_MIS}] Action required: Revision requested for result ${generalData.customData.result_code}`;
  }

  async approvedConfigEmail(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    await this.generalRevisionConfigEmail(generalData, _manager);
    generalData.configEmail.subject = `[${this.appConfig.ARI_MIS}] Result ${generalData.customData.result_code} has been approved`;
  }

  async noApprovedConfigEmail(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    await this.generalRevisionConfigEmail(generalData, _manager);
    generalData.configEmail.subject = `[${this.appConfig.ARI_MIS}] The result ${generalData.customData.result_code} was not approved`;
  }

  async generalRevisionConfigEmail(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    generalData.configEmail.to = [generalData.customData.submitter.email];

    let ccEmails: string[] = [];

    if (
      generalData.customData.action_executor.email ==
      generalData.customData.result_owner.email
    ) {
      ccEmails.push(generalData.customData.result_owner.email);
    } else {
      ccEmails.push(
        generalData.customData.action_executor.email,
        generalData.customData.result_owner.email,
      );
    }

    ccEmails = ccEmails.filter(
      (email) => !generalData.configEmail.to.includes(email),
    );

    generalData.configEmail.cc = ccEmails;
  }

  async findCustomDataSubmitted(
    generalData: GeneralDataDto,
    manager: EntityManager,
  ): Promise<GeneralDataDto> {
    const entityManager = transactionManager(
      manager,
      this.dataSource.createEntityManager(),
    );
    await this.mainRepo.getDataForSubmissionResult(
      generalData.result.result_id,
      generalData,
      entityManager,
    );
    return { ...generalData };
  }

  async findCustomDataForRevision(
    generalData: GeneralDataDto,
    manager: EntityManager,
  ): Promise<GeneralDataDto> {
    const entityManager = transactionManager(
      manager,
      this.dataSource.createEntityManager(),
    );

    await this.mainRepo.getDataForRevisionResult(
      generalData.result.result_id,
      generalData,
      entityManager,
    );
    return { ...generalData };
  }

  async findCustomDataForOicr(
    generalData: GeneralDataDto,
    manager: EntityManager,
  ): Promise<GeneralDataDto> {
    const entityManager = transactionManager(
      manager,
      this.dataSource.createEntityManager(),
    );
    await this.mainRepo.getOicrGeneralData(
      generalData.result.result_id,
      generalData,
      entityManager,
    );
    return { ...generalData };
  }

  async completenessValidation(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    const greenChecks = await this.greenCheckRepository.calculateGreenChecks(
      generalData.result.result_id,
    );

    let completness = true;

    for (const key in greenChecks) {
      completness = completness && greenChecks[key];
    }

    if (!completness)
      throw new BadRequestException(
        'There are still sections pending before the results can be submitted.',
      );
  }

  async reviewOicr(generalData: GeneralDataDto, manager: EntityManager) {
    const entityManager = transactionManager(
      manager,
      this.dataSource.createEntityManager(),
    );
    const oicrRepo = entityManager.getRepository(ResultOicr);
    const oicrInternalCode = generalData.aditionalData.oicr_internal_code
      .toUpperCase()
      .trim();
    const existingRecord = await oicrRepo.findOne({
      where: {
        is_active: true,
        oicr_internal_code: oicrInternalCode,
        result_id: Not(generalData.result.result_id),
      },
    });

    if (existingRecord)
      throw new BadRequestException('The OICR Internal Code already exists');

    const sharepointLink = generalData.aditionalData.sharepoint_link.trim();
    await oicrRepo.update(generalData.result.result_id, {
      oicr_internal_code: oicrInternalCode,
      mel_regional_expert_id: generalData.aditionalData.mel_regional_expert,
      mel_staff_group_id: StaffGroupsEnum.MEL_REGIONAL_EXPERT,
      sharepoint_link: isEmpty(sharepointLink) ? null : sharepointLink,
      ...this.currentUser.audit(SetAuditEnum.UPDATE),
    });

    await this.updateDataUtil.updateLastUpdatedDate(
      generalData.result.result_id,
      entityManager,
      this.currentUser.user_id,
    );
  }

  async oicrRoleChangeStatusValidation(
    _generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    const { roles } = this.currentUser;
    if (this.roleGenericValidation(roles)) return;

    if (!roles.includes(SecRolesEnum.GENERAL_ADMIN))
      throw new ForbiddenException(
        'You are not authorized to perform this action',
      );
  }

  private roleGenericValidation(roles: SecRolesEnum[]) {
    if (roles.includes(SecRolesEnum.SUP_ADMIN)) return true;
    return false;
  }

  async oicrGeneralConfigEmail(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    generalData.configEmail.to = [generalData.customData.result_owner.email];
    const tempCCEmails: string[] = [...this.appConfig.SPRM_EMAIL_ARRAY];
    if (
      generalData.customData.principal_investigator.email ==
      generalData.customData.regional_expert.email
    ) {
      tempCCEmails.push(generalData.customData.regional_expert.email);
    } else {
      tempCCEmails.push(
        generalData.customData.principal_investigator.email,
        generalData.customData.regional_expert.email,
      );
    }

    const ccEmails = tempCCEmails.filter(
      (email) => !generalData.configEmail.to.includes(email),
    );
    generalData.configEmail.cc = ccEmails;
  }

  async oicrApprovalConfigEmail(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    await this.oicrGeneralConfigEmail(generalData, _manager);
    generalData.configEmail.subject = `[${this.appConfig.ARI_MIS}] - Your requested OICR ${generalData.customData.oicr_internal_code} has been accepted`;
  }

  async oicrPostponeConfigEmail(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    await this.oicrGeneralConfigEmail(generalData, _manager);
    generalData.configEmail.subject = `[${this.appConfig.ARI_MIS}] - Your requested OICR ${generalData.customData.oicr_internal_code} was marked as postponed`;
  }

  async oicrRejectedConfigEmail(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    await this.oicrGeneralConfigEmail(generalData, _manager);
    generalData.configEmail.subject = `[${this.appConfig.ARI_MIS}] - Your requested OICR ${generalData.customData.oicr_internal_code} was marked as rejected`;
  }

  async oicrRequestConfigEmail(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    generalData.configEmail.to = this.appConfig.SPRM_EMAIL_ARRAY;
    generalData.configEmail.cc = [generalData.customData.action_executor.email];
    generalData.configEmail.subject = `[${this.appConfig.ARI_MIS}] - New OICR Request - ID ${generalData.customData.result_code}`;
  }

  async commentValidation(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    if (isEmpty(generalData.aditionalData.submission_comment))
      throw new BadRequestException('Comment is required');
  }
}
