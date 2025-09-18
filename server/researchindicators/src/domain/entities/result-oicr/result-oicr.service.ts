import {
  BadRequestException,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { ResultOicr } from './entities/result-oicr.entity';
import { StepOneOicrDto } from './dto/step-one-oicr.dto';
import { ResultTagsService } from '../result-tags/result-tags.service';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { ResultUsersService } from '../result-users/result-users.service';
import { ResultUser } from '../result-users/entities/result-user.entity';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { ResultTag } from '../result-tags/entities/result-tag.entity';
import { LinkResultsService } from '../link-results/link-results.service';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { StepTwoOicrDto } from './dto/step-two-oicr.dto';
import { ResultLeversService } from '../result-levers/result-levers.service';
import { ResultLever } from '../result-levers/entities/result-lever.entity';
import { ResultsService } from '../results/results.service';
import { CreateStepsOicrDto } from './dto/create-steps-oicr.dto';
import { CreateResultOicrDto } from './dto/create-result-oicr.dto';
import { Result } from '../results/entities/result.entity';
import { selectManager } from '../../shared/utils/orm.util';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { AppConfig } from '../../shared/utils/app-config.util';
import { TemplateService } from '../../shared/auxiliar/template/template.service';
import { TemplateEnum } from '../../shared/auxiliar/template/enum/template.enum';
import { ResultOicrRepository } from './repositories/result-oicr.repository';
import { TempExternalOicrsService } from '../temp_external_oicrs/temp_external_oicrs.service';
import { UpdateOicrDto } from './dto/update-oicr.dto';
import { TempResultExternalOicr } from '../temp_external_oicrs/entities/temp_result_external_oicr.entity';
import { isEmpty } from '../../shared/utils/object.utils';
import { LeverRolesEnum } from '../lever-roles/enum/lever-roles.enum';
import { ReportingPlatformEnum } from '../results/enum/reporting-platform.enum';
import { mergeArraysWithPriority } from '../../shared/utils/array.util';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';

@Injectable()
export class ResultOicrService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
    private readonly resultTagsService: ResultTagsService,
    private readonly resultUsersService: ResultUsersService,
    private readonly linkResultService: LinkResultsService,
    private readonly updateDataUtil: UpdateDataUtil,
    private readonly resultLeversService: ResultLeversService,
    @Inject(forwardRef(() => ResultsService))
    private readonly resultService: ResultsService,
    private readonly messageMicroservice: MessageMicroservice,
    private readonly appConfig: AppConfig,
    private readonly templateService: TemplateService,
    private readonly mainRepo: ResultOicrRepository,
    private readonly tempExternalOicrsService: TempExternalOicrsService,
  ) {}

  async create(resultId: number, manager: EntityManager) {
    const entityManager: Repository<ResultOicr> = selectManager(
      manager,
      ResultOicr,
      this.mainRepo,
    );
    return entityManager.save({
      result_id: resultId,
      ...this.currentUser.audit(SetAutitEnum.NEW),
    });
  }

  async createOicr(
    data: CreateResultOicrDto,
    manager?: EntityManager,
    platform_code: ReportingPlatformEnum = ReportingPlatformEnum.STAR,
    resultId?: number,
  ) {
    manager = manager || this.dataSource.manager;

    let result: Result;
    if (!resultId) {
      result = await this.resultService.createResult(
        data.base_information,
        platform_code,
        {
          leverEnum: LeverRolesEnum.OICR_ALIGNMENT,
          result_status_id: ResultStatusEnum.REQUESTED,
          notMap: { lever: true },
        },
      );
      const lever = await this.resultLeversService.find(
        result.result_id,
        LeverRolesEnum.OICR_ALIGNMENT,
      );
      const fullLevers = mergeArraysWithPriority<ResultLever>(
        data?.step_two?.primary_lever,
        lever,
        'lever_id',
      );
      data.step_two.primary_lever = fullLevers as ResultLever[];
    } else {
      result = await this.dataSource.getRepository(Result).findOne({
        where: {
          result_id: resultId,
          is_active: true,
          is_ai: false,
          is_snapshot: false,
        },
      });
    }

    await this.updateOicrSteps(result.result_id, data, manager, !resultId);

    if (!resultId) {
      await this.sendMessageOicr(result.result_id);
    }

    return result;
  }

  async sendMessageOicr(resultId: number) {
    const messageData = await this.mainRepo.getDataToNewOicrMessage(resultId);
    const template = await this.templateService._getTemplate(
      TemplateEnum.OICR_NOTIFICATION_CREATED,
      messageData,
    );
    if (template) {
      await this.messageMicroservice.sendEmail({
        subject: `[STAR] - New OICR Submission #${messageData.result_code}`,
        to: this.appConfig.SPRM_EMAIL_SAFE(this.currentUser.email),
        message: {
          socketFile: Buffer.from(template),
        },
      });
    }
  }

  async updateOicr(resultId: number, data: UpdateOicrDto) {
    const existingOicrInternalCode = await this.mainRepo.findOne({
      where: {
        is_active: true,
        oicr_internal_code: data?.oicr_internal_code,
        result_id: Not(resultId),
      },
    });

    await this.mainRepo.update(resultId, {
      oicr_internal_code: existingOicrInternalCode
        ? null
        : data.oicr_internal_code,
      outcome_impact_statement: data?.outcome_impact_statement,
      short_outcome_impact_statement: data?.short_outcome_impact_statement,
      general_comment: data?.general_comment,
      maturity_level_id: data?.maturity_level_id,
      ...this.currentUser.audit(SetAutitEnum.UPDATE),
    });

    const saveTags: Partial<ResultTag>[] = !isEmpty(data?.tagging)
      ? [{ tag_id: data.tagging?.tag_id }]
      : [];
    await this.resultTagsService.create(resultId, saveTags, 'tag_id');

    const saveLinkedResults: Partial<TempResultExternalOicr>[] = !isEmpty(
      data?.link_result,
    )
      ? [{ external_oicr_id: data.link_result?.external_oicr_id }]
      : [];

    await this.tempExternalOicrsService.create(
      resultId,
      saveLinkedResults,
      'external_oicr_id',
    );
  }

  async findOicrs(resultId: number): Promise<UpdateOicrDto> {
    const oicr = await this.mainRepo.findOne({
      where: {
        is_active: true,
        result_id: resultId,
      },
    });

    const tagging = await this.resultTagsService
      .find(resultId)
      .then((tags) => tags?.[0]);

    const link_result = await this.tempExternalOicrsService
      .find(resultId)
      .then((links) => links?.[0]);

    return {
      general_comment: oicr?.general_comment,
      maturity_level_id: oicr?.maturity_level_id,
      oicr_internal_code: oicr?.oicr_internal_code,
      outcome_impact_statement: oicr?.outcome_impact_statement,
      short_outcome_impact_statement: oicr?.short_outcome_impact_statement,
      tagging,
      link_result,
    };
  }

  private async updateOicrSteps(
    resultId: number,
    data: CreateResultOicrDto,
    manager: EntityManager,
    isNew: boolean = true,
  ) {
    await this.stepOneOicr(data?.step_one, resultId, manager, isNew);
    await this.stepTwoOicr(data?.step_two, resultId, manager);
    await this.resultService.saveGeoLocation(resultId, data?.step_three);
    const tempGeneralComment =
      typeof data?.step_four?.general_comment == 'string'
        ? data.step_four.general_comment
        : null;
    await manager.getRepository(ResultOicr).update(resultId, {
      general_comment: tempGeneralComment,
    });
    await manager.getRepository(Result).update(resultId, {
      description: data?.step_one?.outcome_impact_statement,
    });
  }

  async createOicrSteps(
    resultId: number,
    data: CreateStepsOicrDto,
    step: number,
  ) {
    await this.updateDataUtil.updateLastUpdatedDate(resultId);

    switch (step) {
      case 1:
        return this.stepOneOicr(data, resultId);
      case 2:
        return this.stepTwoOicr(data, resultId);
      case 3:
        return this.resultService.saveGeoLocation(resultId, data);
      case 4:
        return this.mainRepo.update(resultId, {
          general_comment: data.general_comment,
        });
      default:
        throw new BadRequestException('Invalid step number');
    }
  }

  async stepTwoOicr(
    data: StepTwoOicrDto,
    resultId: number,
    manager?: EntityManager,
  ) {
    const savePrimaryLevers: Partial<ResultLever>[] = data.primary_lever.map(
      (lever) => ({
        lever_id: lever.lever_id,
        is_primary: true,
      }),
    );

    const saveContributorLevers: Partial<ResultLever>[] =
      data.contributor_lever.map((lever) => ({
        lever_id: lever.lever_id,
        is_primary: false,
      }));

    const allLevers = [...savePrimaryLevers, ...saveContributorLevers];

    await this.resultLeversService.create(
      resultId,
      allLevers,
      'lever_id',
      LeverRolesEnum.OICR_ALIGNMENT,
      manager,
      ['is_primary'],
    );
  }

  async stepOneOicr(
    data: StepOneOicrDto,
    resultId: number,
    manager?: EntityManager,
    isNew: boolean = true,
  ) {
    const saveUsers: Partial<ResultUser> = {
      user_id: data?.main_contact_person?.user_id,
    };
    await this.resultUsersService.create(
      resultId,
      saveUsers,
      'user_id',
      UserRolesEnum.MAIN_CONTACT,
      manager,
    );

    const saveTags: Partial<ResultTag>[] = !isEmpty(data?.tagging)
      ? [
          {
            tag_id: data?.tagging?.tag_id,
          },
        ]
      : [];

    const createdTags = await this.resultTagsService.create(
      resultId,
      saveTags,
      'tag_id',
      undefined,
      manager,
    );

    if (isNew) {
      const saveLinkedResults: Partial<TempResultExternalOicr>[] = !isEmpty(
        createdTags,
      )
        ? [data?.link_result]
        : [];
      await this.tempExternalOicrsService.create(
        resultId,
        saveLinkedResults,
        'external_oicr_id',
        undefined,
        manager,
      );
    }

    await this.mainRepo.update(resultId, {
      outcome_impact_statement: data.outcome_impact_statement,
      ...this.currentUser.audit(SetAutitEnum.UPDATE),
    });
  }

  async findModal(resultId: number): Promise<CreateResultOicrDto> {
    const stepOne = await this.findStepOneIoicr(resultId);
    const stepTwo = await this.findStepTwoOicr(resultId);
    const stepThree = await this.resultService.findGeoLocation(resultId);
    const baseInformation = await this.resultService.findBaseInfo(resultId);
    const stepFour = await this.mainRepo
      .findOne({
        where: {
          result_id: resultId,
        },
        select: {
          general_comment: true,
        },
      })
      .then((result) => result?.general_comment || '');

    return {
      step_one: stepOne,
      step_two: stepTwo,
      step_three: stepThree,
      step_four: {
        general_comment: stepFour,
      },
      base_information: baseInformation,
    };
  }

  private async findStepOneIoicr(resultId: number): Promise<StepOneOicrDto> {
    const main_contact_person = await this.resultUsersService
      .findUsersByRoleResult(UserRolesEnum.MAIN_CONTACT, resultId)
      .then((users) => users?.[0]);
    const link_result = await this.tempExternalOicrsService
      .find(resultId)
      .then((links) => links?.[0]);
    const tagging = await this.resultTagsService
      .find(resultId)
      .then((tags) => tags?.[0]);
    const outcome_impact_statement = await this.mainRepo
      .findOne({
        where: {
          result_id: resultId,
          is_active: true,
        },
        select: {
          outcome_impact_statement: true,
        },
      })
      .then((result) => result?.outcome_impact_statement);

    return {
      main_contact_person,
      link_result,
      tagging,
      outcome_impact_statement,
    };
  }

  private async findStepTwoOicr(resultId: number): Promise<StepTwoOicrDto> {
    const allLevers = await this.resultLeversService.find(
      resultId,
      LeverRolesEnum.OICR_ALIGNMENT,
    );

    return {
      primary_lever: allLevers.filter((lever) => lever.is_primary),
      contributor_lever: allLevers.filter((lever) => !lever.is_primary),
    };
  }
}
