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
import {
  filterByUniqueKeyWithPriority,
  mergeArraysWithPriority,
} from '../../shared/utils/array.util';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { ResultContractsService } from '../result-contracts/result-contracts.service';
import {
  CountryDto,
  LeverDto,
  MainLeverDto,
  ProjectDto,
  RegionDto,
  ResultMappedDto,
} from './dto/response-oicr-word-template.dto';
import { ReviewDto } from './dto/review.dto';
import { StaffGroupsEnum } from '../staff-groups/enum/staff-groups.enum';
import { ResultQuantificationsService } from '../result-quantifications/result-quantifications.service';
import { QuantificationRolesEnum } from '../quantification-roles/enum/quantification-roles.enum';
import { ResultNotableReferencesService } from '../result-notable-references/result-notable-references.service';
import { ResultImpactAreasService } from '../result-impact-areas/result-impact-areas.service';

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
    private readonly resultContractService: ResultContractsService,
    private readonly resultQuantificationsService: ResultQuantificationsService,
    private readonly resultNotableReferencesService: ResultNotableReferencesService,
    private readonly resultImpactAreasService: ResultImpactAreasService,
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
          leverEnum: LeverRolesEnum.ALIGNMENT,
          result_status_id: ResultStatusEnum.REQUESTED,
          notMap: { lever: true },
        },
      );
      const lever = await this.resultLeversService.find(
        result.result_id,
        LeverRolesEnum.ALIGNMENT,
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
    messageData.cration_date = new Date(messageData.cration_date)
      .toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      .toLowerCase();

    const template = await this.templateService._getTemplate(
      TemplateEnum.OICR_NOTIFICATION_CREATED,
      messageData,
    );
    if (template) {
      await this.messageMicroservice.sendEmail({
        subject: `[STAR] - New OICR Request #${messageData.result_code}`,
        to: this.appConfig.SPRM_EMAIL_SAFE(this.currentUser.email),
        message: {
          socketFile: Buffer.from(template),
        },
        bcc: process.env.ARI_MAPPED_BCC_SUBM_OICR,
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
      for_external_use: data?.for_external_use,
      for_external_use_description: data?.for_external_use_description,
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

    await this.resultQuantificationsService.upsertByCompositeKeys(
      resultId,
      data?.actual_count ?? [],
      ['quantification_number', 'unit', 'description'],
      QuantificationRolesEnum.ACTUAL_COUNT,
    );

    await this.resultQuantificationsService.upsertByCompositeKeys(
      resultId,
      data?.extrapolate_estimates ?? [],
      ['quantification_number', 'unit', 'description'],
      QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES,
    );

    await this.resultNotableReferencesService.upsertByCompositeKeys(
      resultId,
      data?.notable_references ?? [],
      ['notable_reference_type_id', 'link'],
    );

    await this.resultImpactAreasService.create(
      resultId,
      data?.result_impact_areas ?? [],
      'impact_area_id',
      undefined,
      undefined,
      ['impact_area_score_id'],
    );

    await this.updateDataUtil.updateLastUpdatedDate(resultId);
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

    const quantifications =
      await this.resultQuantificationsService.findByResultIdAndRoles(resultId, [
        QuantificationRolesEnum.ACTUAL_COUNT,
        QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES,
      ]);

    const result_impact_areas =
      await this.resultImpactAreasService.find(resultId);

    const notable_references =
      await this.resultNotableReferencesService.find(resultId);

    return {
      general_comment: oicr?.general_comment,
      maturity_level_id: oicr?.maturity_level_id,
      oicr_internal_code: oicr?.oicr_internal_code,
      outcome_impact_statement: oicr?.outcome_impact_statement,
      short_outcome_impact_statement: oicr?.short_outcome_impact_statement,
      tagging,
      link_result,
      actual_count: quantifications?.filter(
        (q) =>
          q.quantification_role_id === QuantificationRolesEnum.ACTUAL_COUNT,
      ),
      extrapolate_estimates: quantifications?.filter(
        (q) =>
          q.quantification_role_id ===
          QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES,
      ),
      notable_references,
      for_external_use: oicr?.for_external_use,
      for_external_use_description: oicr?.for_external_use_description,
      result_impact_areas,
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

    await this.updateDataUtil.updateLastUpdatedDate(resultId, manager);
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
        lever_id: lever?.lever_id,
        is_primary: true,
      }),
    );

    const saveContributorLevers: Partial<ResultLever>[] =
      data.contributor_lever.map((lever) => ({
        lever_id: lever?.lever_id,
        is_primary: false,
      }));

    const allLevers = [...savePrimaryLevers, ...saveContributorLevers];

    const datalever = filterByUniqueKeyWithPriority<Partial<ResultLever>>(
      allLevers,
      'lever_id',
      'is_primary',
    );

    await this.resultLeversService.create(
      resultId,
      datalever,
      'lever_id',
      LeverRolesEnum.ALIGNMENT,
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
      LeverRolesEnum.ALIGNMENT,
    );

    const leverId =
      await this.resultContractService.getLeverFromPrimaryContract(resultId);

    return {
      primary_lever: allLevers
        .filter((lever) => lever.is_primary)
        .map(
          (el) =>
            ({
              ...el,
              is_contract_lever: el.lever_id == String(leverId),
            }) as unknown as ResultLever,
        ),
      contributor_lever: allLevers.filter((lever) => !lever.is_primary),
    };
  }

  async review(resultId: number, data: ReviewDto) {
    const existingRecord = await this.mainRepo.findOne({
      where: {
        is_active: true,
        oicr_internal_code: data?.oicr_internal_code,
        result_id: Not(resultId),
      },
    });
    if (existingRecord)
      throw new BadRequestException('OICR Internal Code already exists');

    await this.mainRepo.update(resultId, {
      oicr_internal_code: data.oicr_internal_code,
      mel_regional_expert_id: data.mel_regional_expert,
      mel_staff_group_id: StaffGroupsEnum.MEL_REGIONAL_EXPERT,
      sharepoint_link: isEmpty(data?.sharepoint_link?.trim())
        ? null
        : data.sharepoint_link,
      ...this.currentUser.audit(SetAutitEnum.UPDATE),
    });
  }

  async getResultOicrDetailsByOfficialCode(
    resultId: number,
  ): Promise<ResultMappedDto> {
    const rawResults =
      await this.mainRepo.getResultOicrDetailsByOfficialCode(resultId);

    if (!rawResults || rawResults.length === 0) {
      return null;
    }

    const firstRow = rawResults[0];

    const projectsMap = new Map<string, ProjectDto>();
    const leversMap = new Map<string, LeverDto>();
    const regionsMap = new Map<string, RegionDto>();
    const countriesMap = new Map<string, CountryDto>();
    const mainLeversMap = new Map<string, MainLeverDto>();

    rawResults.forEach((row) => {
      if (row.project_id && row.project_title) {
        projectsMap.set(row.project_id, {
          project_id: row.project_id,
          project_title: row.project_title,
        });
      }

      if (row.main_lever_id && row.main_lever) {
        mainLeversMap.set(row.main_lever_id, {
          main_lever_id: row.main_lever_id,
          main_lever: row.main_lever,
          main_lever_name: row.main_lever_name,
        });
      }

      if (row.lever_id && row.lever) {
        leversMap.set(row.lever_id, {
          lever_id: row.lever_id,
          lever_short: row.lever,
          lever_full: row.lever_name,
        });
      }

      if (row.region_code && row.region_name) {
        regionsMap.set(row.region_code, {
          region_code: row.region_code,
          region_name: row.region_name,
        });
      }

      if (row.country_code && row.country_name) {
        countriesMap.set(row.country_code, {
          country_code: row.country_code,
          country_name: row.country_name,
        });
      }
    });

    return {
      id: firstRow.result_id,
      official_code: firstRow.result_code,
      title: firstRow.title,
      main_project_id: firstRow.main_project_id,
      main_project: firstRow.main_project_title,
      other_projects: Array.from(projectsMap.values()),
      tag_id: firstRow.tag_id ?? '',
      tag_name: firstRow.tag_name ?? '',
      outcome_impact_statement: firstRow.outcome_impact_statement ?? '',
      main_levers: Array.from(mainLeversMap.values()),
      other_levers: Array.from(leversMap.values()),
      geographic_scope: firstRow.geographic_scope ?? '',
      regions: Array.from(regionsMap.values()),
      countries: Array.from(countriesMap.values()),
      geographic_scope_comments: firstRow.comment_geo_scope ?? '',
      handle_link: firstRow.handle_link ?? '',
    };
  }
}
