import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Template } from '../../shared/auxiliar/template/entities/template.entity';
import { GeneralDataDto } from './config/config-workflow';
import { ResultStatusWorkflowRepository } from './repositories/result-status-workflow.repository';
import { transactionManager } from '../../shared/utils/orm.util';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { AppConfig } from '../../shared/utils/app-config.util';
import { GreenCheckRepository } from '../green-checks/repository/green-checks.repository';
import { isEmpty } from '../../shared/utils/object.utils';

@Injectable()
export class StatusWorkflowFunctionHandlerService {
  protected readonly mainRepo: ResultStatusWorkflowRepository;
  constructor(
    private readonly dataSource: DataSource,
    resultStatusWorkflowRepository: ResultStatusWorkflowRepository,
    private readonly messageMicroservice: MessageMicroservice,
    private readonly appConfig: AppConfig,
    private readonly greenCheckRepository: GreenCheckRepository,
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

  async commentValidation(
    generalData: GeneralDataDto,
    _manager: EntityManager,
  ) {
    if (isEmpty(generalData.aditionalData.submission_comment))
      throw new BadRequestException('Comment is required');
  }
}
