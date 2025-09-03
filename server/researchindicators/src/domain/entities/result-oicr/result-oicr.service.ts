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
import { ResultInitiativesService } from '../result-initiatives/result-initiatives.service';
import { StepTwoOicrDto } from './dto/step-two-oicr.dto';
import { ResultInitiative } from '../result-initiatives/entities/result-initiative.entity';
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

@Injectable()
export class ResultOicrService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
    private readonly resultTagsService: ResultTagsService,
    private readonly resultUsersService: ResultUsersService,
    private readonly linkResultService: LinkResultsService,
    private readonly updateDataUtil: UpdateDataUtil,
    private readonly resultInitiativesService: ResultInitiativesService,
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

  async createOicr(data: CreateResultOicrDto) {
    const result = await this.resultService.createResult(data.base_information);
    await this.stepOneOicr(data.step_one, result.result_id);
    await this.stepTwoOicr(data.step_two, result.result_id);
    await this.resultService.saveGeoLocation(result.result_id, data.step_three);
    const tempGeneralComment =
      typeof data?.step_four?.general_comment == 'string'
        ? data.step_four.general_comment
        : null;
    await this.mainRepo.update(result.result_id, {
      general_comment: tempGeneralComment,
    });
    await this.dataSource.getRepository(Result).update(result.result_id, {
      description: data?.step_one?.outcome_impact_statement,
    });

    await this.sendMessageOicr(result.result_id);

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

  async stepTwoOicr(data: StepTwoOicrDto, resultId: number) {
    return this.dataSource.transaction(async (manager) => {
      const saveInitiatives: Partial<ResultInitiative>[] = data.initiatives.map(
        (initiative) => ({
          clarisa_initiative_id: initiative.clarisa_initiative_id,
        }),
      );
      await this.resultInitiativesService.create(
        resultId,
        saveInitiatives,
        'clarisa_initiative_id',
        undefined,
        manager,
      );

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
        undefined,
        manager,
        ['is_primary'],
      );
    });
  }

  async stepOneOicr(data: StepOneOicrDto, resultId: number) {
    await this.dataSource.transaction(async (manager) => {
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

      await this.mainRepo.update(resultId, {
        outcome_impact_statement: data.outcome_impact_statement,
        ...this.currentUser.audit(SetAutitEnum.UPDATE),
      });
    });
  }

  async findByResultIdAndSteps(resultId: number, step: number) {
    switch (step) {
      case 1:
        return this.findStepOneIoicr(resultId);
      case 2:
        return this.findStepTwoOicr(resultId);
      case 3:
        return this.resultService.findGeoLocation(resultId);
      case 4:
        return this.mainRepo
          .findOne({
            where: {
              result_id: resultId,
            },
            select: {
              general_comment: true,
            },
          })
          .then((result) => result?.general_comment || '');
      default:
        throw new BadRequestException('Invalid step number');
    }
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
    const initiatives = await this.resultInitiativesService.find(resultId);
    const allLevers = await this.resultLeversService.find(resultId);

    return {
      initiatives,
      primary_lever: allLevers.filter((lever) => lever.is_primary),
      contributor_lever: allLevers.filter((lever) => !lever.is_primary),
    };
  }
}
