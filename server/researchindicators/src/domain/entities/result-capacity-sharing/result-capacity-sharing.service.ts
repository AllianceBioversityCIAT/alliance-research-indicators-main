import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultCapacitySharing } from './entities/result-capacity-sharing.entity';
import { cleanNumberForDB, selectManager } from '../../shared/utils/orm.util';
import {
  CapDevGroupDto,
  CapDevIndividualDto,
  UpdateResultCapacitySharingDto,
} from './dto/update-result-capacity-sharing.dto';
import { ResultUsersService } from '../result-users/result-users.service';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { ResultLanguagesService } from '../result-languages/result-languages.service';
import { LanguageRolesEnum } from '../language-roles/enums/language-roles.enum';
import { ResultInstitutionsService } from '../result-institutions/result-institutions.service';
import { InstitutionRolesEnum } from '../institution-roles/enums/institution-roles.enum';
import { ResultCountriesService } from '../result-countries/result-countries.service';
import { CountryRolesEnum } from '../country-roles/enums/country-roles.anum';
import { SessionFormatEnum } from '../session-formats/enums/session-format.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { Result } from '../results/entities/result.entity';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ResultRawAi } from '../results/dto/result-ai.dto';
import { AiRoarMiningApp } from '../../tools/broker/ai-roar-mining.app';
import { SessionLengthsService } from '../session-lengths/session-lengths.service';
import { DeliveryModalitiesService } from '../delivery-modalities/delivery-modalities.service';
import { DeliveryModality } from '../delivery-modalities/entities/delivery-modality.entity';
import { SessionFormatsService } from '../session-formats/session-formats.service';
import { DegreesService } from '../degrees/degrees.service';
import { SessionTypesService } from '../session-types/session-types.service';
import { nextToProcessAiRaw } from '../../shared/utils/validations.utils';
import { SessionPurposesService } from '../session-purposes/session-purposes.service';
import { SessionPurposeEnum } from '../session-purposes/enum/session-purpose.enum';
import { ClarisaCountriesService } from '../../tools/clarisa/entities/clarisa-countries/clarisa-countries.service';
import { ResultCountry } from '../result-countries/entities/result-country.entity';
import { GendersService } from '../genders/genders.service';
import { isEmpty } from '../../shared/utils/object.utils';
import { ResultInstitution } from '../result-institutions/entities/result-institution.entity';
import { ResultInstitutionAi } from '../result-institutions/entities/result-institution-ai.entity';
import { AllianceUserStaffService } from '../alliance-user-staff/alliance-user-staff.service';
import { ResultUserAi } from '../result-users/entities/result-user-ai.entity';
import { ResultUser } from '../result-users/entities/result-user.entity';
import { ClarisaLanguagesService } from '../../tools/clarisa/entities/clarisa-languages/clarisa-languages.service';
import { ResultLanguage } from '../result-languages/entities/result-language.entity';
@Injectable()
export class ResultCapacitySharingService {
  private mainRepo: Repository<ResultCapacitySharing>;
  constructor(
    private dataSource: DataSource,
    private readonly _resultUserService: ResultUsersService,
    private readonly _resultLanguageService: ResultLanguagesService,
    private readonly _resultInstitutionService: ResultInstitutionsService,
    private readonly _resultCountryService: ResultCountriesService,
    private readonly _currentUser: CurrentUserUtil,
    private readonly _updateDataUtil: UpdateDataUtil,
    private readonly _aiRoarMiningApp: AiRoarMiningApp,
    private readonly _sessionLengthsService: SessionLengthsService,
    private readonly _deliveryModalitiesService: DeliveryModalitiesService,
    private readonly _sessionFormatsService: SessionFormatsService,
    private readonly _sessionTypesService: SessionTypesService,
    private readonly _degreesService: DegreesService,
    private readonly _sessionPurposesService: SessionPurposesService,
    private readonly _clarisaCountriesService: ClarisaCountriesService,
    private readonly _gendersService: GendersService,
    private readonly _allianceUserStaffService: AllianceUserStaffService,
    private readonly _clarisaLanguagesService: ClarisaLanguagesService,
  ) {
    this.mainRepo = dataSource.getRepository(ResultCapacitySharing);
  }

  async processedAiInfo(
    rawData: ResultRawAi,
  ): Promise<UpdateResultCapacitySharingDto> {
    const tempCapSharing: UpdateResultCapacitySharingDto =
      new UpdateResultCapacitySharingDto();
    tempCapSharing.end_date = <Date>(
      this._aiRoarMiningApp.cleanDataNotProvided(rawData.end_date, 'date')
    );
    tempCapSharing.start_date = <Date>(
      this._aiRoarMiningApp.cleanDataNotProvided(rawData.start_date, 'date')
    );

    const clean_trainingType = <string>(
      this._aiRoarMiningApp.cleanDataNotProvided(
        rawData.training_type,
        'string',
      )
    );
    const trainingType =
      await this._sessionFormatsService.findByName(clean_trainingType);
    tempCapSharing.session_format_id = trainingType?.session_format_id;

    const clean_sessionLength = <string>(
      this._aiRoarMiningApp.cleanDataNotProvided(
        rawData.length_of_training,
        'string',
      )
    );

    if (!isEmpty(rawData.training_supervisor)) {
      const { acept, pending } = this._resultUserService.filterInstitutionsAi(
        [rawData.training_supervisor],
        UserRolesEnum.TRAINING_SUPERVISOR,
      );

      tempCapSharing.training_supervisor = !isEmpty(acept)
        ? (acept[0] as ResultUser)
        : null;

      tempCapSharing.training_supervisor_ai = !isEmpty(pending)
        ? (pending[0] as ResultUserAi)
        : null;
    }

    const sessionLength =
      await this._sessionLengthsService.findByName(clean_sessionLength);
    tempCapSharing.session_length_id = sessionLength?.session_length_id;

    const clean_training_category = await nextToProcessAiRaw(
      rawData?.training_category,
      (name) => this._sessionTypesService.findByName(name),
    );
    tempCapSharing.session_type_id = clean_training_category?.session_type_id;

    const clean_sessionFormat = <string>(
      this._aiRoarMiningApp.cleanDataNotProvided(
        rawData.delivery_modality,
        'string',
      )
    );
    const deliveryModality: DeliveryModality =
      await this._deliveryModalitiesService.findByName(clean_sessionFormat);
    tempCapSharing.delivery_modality_id =
      deliveryModality?.delivery_modality_id;
    const degree = await this._degreesService.findByName(rawData.degree);
    tempCapSharing.degree_id = degree?.degree_id;
    const clean_language = await nextToProcessAiRaw(
      rawData?.language?.code,
      (name) => this._clarisaLanguagesService.findOneByiso3(name),
    );
    tempCapSharing.training_supervisor_languages = clean_language
      ? ({ language_id: clean_language.id } as ResultLanguage)
      : null;
    tempCapSharing.group = await this.processedAiInfoGroup(rawData);
    tempCapSharing.individual = await this.processedAiInfoIndividual(rawData);

    return tempCapSharing;
  }

  async processedAiInfoIndividual(
    rawData: ResultRawAi,
  ): Promise<CapDevIndividualDto> {
    const tempCapSharing: CapDevIndividualDto = new CapDevIndividualDto();

    tempCapSharing.trainee_name = <string>(
      this._aiRoarMiningApp.cleanDataNotProvided(rawData.trainee_name, 'string')
    );

    const clean_nationality = await nextToProcessAiRaw(
      rawData?.trainee_nationality?.code,
      (name) => this._clarisaCountriesService.findByIso2([name]),
    ).then((res) => (res && res.length > 0 ? res[0] : null));

    tempCapSharing.nationality = clean_nationality
      ? ({
          isoAlpha2: clean_nationality.isoAlpha2,
        } as ResultCountry)
      : null;

    const clean_gender = await nextToProcessAiRaw(
      rawData.trainee_gender,
      (name) => this._gendersService.findByName(name),
    );
    if (!isEmpty(rawData.trainee_affiliation)) {
      const { acept, pending } =
        this._resultInstitutionService.filterInstitutionsAi(
          [rawData.trainee_affiliation],
          InstitutionRolesEnum.TRAINEE_AFFILIATION,
        );
      tempCapSharing.affiliation = !isEmpty(acept)
        ? (acept[0] as ResultInstitution)
        : null;
      tempCapSharing.affiliation_ai = !isEmpty(pending)
        ? (pending[0] as ResultInstitutionAi)
        : null;
    }

    tempCapSharing.gender_id = clean_gender?.gender_id;

    return tempCapSharing;
  }

  async processedAiInfoGroup(rawData: ResultRawAi): Promise<CapDevGroupDto> {
    const tempCapSharing: CapDevGroupDto = new CapDevGroupDto();
    tempCapSharing.session_participants_female = <number>(
      this._aiRoarMiningApp.cleanDataNotProvided(
        rawData.female_participants,
        'number',
      )
    );

    tempCapSharing.session_participants_male = <number>(
      this._aiRoarMiningApp.cleanDataNotProvided(
        rawData.male_participants,
        'number',
      )
    );
    tempCapSharing.session_participants_non_binary = <number>(
      this._aiRoarMiningApp.cleanDataNotProvided(
        rawData.non_binary_participants,
        'number',
      )
    );

    tempCapSharing.session_participants_total = <number>(
      this._aiRoarMiningApp.cleanDataNotProvided(
        rawData.total_participants,
        'number',
      )
    );

    if (rawData?.training_purpose) {
      const clean_training_purpose = await nextToProcessAiRaw(
        rawData.training_purpose,
        (name) => this._sessionPurposesService.findByName(name),
      );
      tempCapSharing.session_purpose_id = clean_training_purpose
        ? clean_training_purpose.session_purpose_id
        : SessionPurposeEnum.OTHER;

      tempCapSharing.session_purpose_description =
        clean_training_purpose?.session_purpose_id == SessionPurposeEnum.OTHER
          ? rawData.training_purpose
          : null;
    }

    tempCapSharing.session_purpose_description = <string>(
      this._aiRoarMiningApp.cleanDataNotProvided(
        rawData.training_purpose,
        'string',
      )
    );

    return tempCapSharing;
  }

  async create(result_id: number, manager?: EntityManager) {
    const entityManager: Repository<ResultCapacitySharing> = selectManager(
      manager,
      ResultCapacitySharing,
      this.mainRepo,
    );

    const existResult = await entityManager.findOne({
      where: {
        result_id: result_id,
      },
    });

    if (existResult) {
      throw new ConflictException('Result capacity sharing already exists');
    }

    const resultCapSharing = entityManager.save({
      result_id: result_id,
      ...this._currentUser.audit(SetAutitEnum.NEW),
    });
    return resultCapSharing;
  }

  async update(
    resultId: number,
    updateData: UpdateResultCapacitySharingDto,
    isAi: boolean = false,
  ) {
    const existResult = await this.mainRepo.findOne({
      where: {
        result_id: resultId,
        is_active: true,
      },
    });

    if (!existResult) {
      throw new ConflictException('Result capacity sharing not found');
    }

    const { result_id } = existResult;

    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(this.mainRepo.target).update(result_id, {
        session_format_id: updateData?.session_format_id,
        session_type_id: updateData?.session_type_id,
        delivery_modality_id: updateData?.delivery_modality_id,
        start_date: updateData?.start_date,
        end_date: updateData?.end_date,
        degree_id: updateData?.degree_id,
        session_length_id: updateData?.session_length_id,
        ...this._currentUser.audit(SetAutitEnum.UPDATE),
      });

      switch (updateData?.session_format_id) {
        case SessionFormatEnum.GROUP:
          await this.groupUpdate(result_id, updateData.group, manager);
          break;
        case SessionFormatEnum.INDIVIDUAL:
          await this.individualUpdate(
            result_id,
            updateData.individual,
            manager,
            isAi,
          );
          break;
      }

      await this._resultUserService.create<UserRolesEnum>(
        result_id,
        updateData?.training_supervisor,
        'user_id',
        UserRolesEnum.TRAINING_SUPERVISOR,
        manager,
      );

      if (isAi && updateData?.training_supervisor_ai) {
        await this._resultUserService.insertUserAi(
          result_id,
          [updateData?.training_supervisor_ai],
          UserRolesEnum.TRAINING_SUPERVISOR,
          manager,
        );
      }
      await this._resultLanguageService.create<LanguageRolesEnum>(
        resultId,
        updateData?.training_supervisor_languages,
        'language_id',
        LanguageRolesEnum.TRAINING_SUPERVISOR,
        manager,
      );

      await this._updateDataUtil.updateLastUpdatedDate(resultId, manager);
    });
  }

  private async groupUpdate(
    resultId: number,
    updateData: CapDevGroupDto,
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultCapacitySharing> = selectManager(
      manager,
      ResultCapacitySharing,
      this.mainRepo,
    );

    await entityManager.update(resultId, {
      session_participants_female: cleanNumberForDB(
        updateData?.session_participants_female,
      ),
      session_participants_male: cleanNumberForDB(
        updateData?.session_participants_male,
      ),
      session_participants_non_binary: cleanNumberForDB(
        updateData?.session_participants_non_binary,
      ),
      session_participants_total: cleanNumberForDB(
        updateData?.session_participants_total,
      ),
      session_purpose_id: updateData?.session_purpose_id,
      session_purpose_description: updateData?.session_purpose_description,
      is_attending_organization: updateData?.is_attending_organization,
      //Unnecessary fields null asignation
      trainee_name: null,
      gender_id: null,
      ...this._currentUser.audit(SetAutitEnum.UPDATE),
    });

    await this._resultInstitutionService.create<InstitutionRolesEnum>(
      resultId,
      updateData?.is_attending_organization
        ? updateData?.trainee_organization_representative
        : null,
      'institution_id',
      InstitutionRolesEnum.TRAINEE_ORGANIZATION_REPRESENTATIVE,
      manager,
    );

    //Unnecessary Data inactivate for group
    await this._resultInstitutionService.create<InstitutionRolesEnum>(
      resultId,
      null,
      'institution_id',
      InstitutionRolesEnum.TRAINEE_AFFILIATION,
      manager,
    );

    await this._resultCountryService.create<CountryRolesEnum>(
      resultId,
      null,
      'isoAlpha2',
      CountryRolesEnum.TRAINEE_NATIONALITY,
      manager,
    );
  }

  private async individualUpdate(
    resultId: number,
    updateData: CapDevIndividualDto,
    manager?: EntityManager,
    isAi: boolean = false,
  ) {
    const entityManager: Repository<ResultCapacitySharing> = selectManager(
      manager,
      ResultCapacitySharing,
      this.mainRepo,
    );

    await entityManager.update(resultId, {
      trainee_name: updateData?.trainee_name,
      gender_id: updateData?.gender_id,
      ...this._currentUser.audit(SetAutitEnum.UPDATE),
      //Unnecessary fields null asignation
      session_participants_female: null,
      session_participants_male: null,
      session_participants_non_binary: null,
      session_participants_total: null,
      session_purpose_id: null,
      session_purpose_description: null,
      is_attending_organization: null,
    });

    await this._resultInstitutionService.create<InstitutionRolesEnum>(
      resultId,
      updateData?.affiliation,
      'institution_id',
      InstitutionRolesEnum.TRAINEE_AFFILIATION,
      manager,
    );

    if (isAi && updateData?.affiliation_ai) {
      await this._resultInstitutionService.insertInstitutionsAi(
        resultId,
        [updateData?.affiliation_ai],
        InstitutionRolesEnum.TRAINEE_AFFILIATION,
        manager,
      );
    }

    await this._resultCountryService.create<CountryRolesEnum>(
      resultId,
      updateData?.nationality,
      'isoAlpha2',
      CountryRolesEnum.TRAINEE_NATIONALITY,
      manager,
    );

    //Unnecessary Data inactivate for individual
    await this._resultInstitutionService.create<InstitutionRolesEnum>(
      resultId,
      null,
      'institution_id',
      InstitutionRolesEnum.TRAINEE_ORGANIZATION_REPRESENTATIVE,
      manager,
    );
  }

  async findByResultId(
    resultId: number,
  ): Promise<Partial<UpdateResultCapacitySharingDto>> {
    const validateIndicator = await this.dataSource
      .getRepository(Result)
      .findOne({
        where: {
          result_id: resultId,
          indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
          is_active: true,
        },
      })
      .then((result) => result !== null);
    if (!validateIndicator) {
      throw new ConflictException(
        'The result does not have the capacity sharing for development indicator',
      );
    }
    const resultCapDev = await this.mainRepo.findOne({
      where: {
        result_id: resultId,
        is_active: true,
      },
    });

    let groupResponse: CapDevGroupDto = undefined;
    let individualResponse: CapDevIndividualDto = undefined;

    if (resultCapDev?.session_format_id === SessionFormatEnum.GROUP) {
      const institution =
        await this._resultInstitutionService.findInstitutionsByRoleResult(
          resultCapDev.result_id,
          InstitutionRolesEnum.TRAINEE_ORGANIZATION_REPRESENTATIVE,
        );

      groupResponse = {
        is_attending_organization: resultCapDev.is_attending_organization,
        session_participants_female: resultCapDev.session_participants_female,
        session_participants_male: resultCapDev.session_participants_male,
        session_participants_non_binary:
          resultCapDev.session_participants_non_binary,
        session_participants_total: resultCapDev.session_participants_total,
        session_purpose_description: resultCapDev.session_purpose_description,
        session_purpose_id: resultCapDev.session_purpose_id,
        trainee_organization_representative: institution,
      };
    } else if (
      resultCapDev?.session_format_id === SessionFormatEnum.INDIVIDUAL
    ) {
      const institution =
        await this._resultInstitutionService.findOneInstitutionByRoleResult(
          resultCapDev.result_id,
          InstitutionRolesEnum.TRAINEE_AFFILIATION,
        );

      const nationality =
        await this._resultCountryService.findOneCountryByRoleResult(
          resultCapDev.result_id,
          CountryRolesEnum.TRAINEE_NATIONALITY,
        );
      individualResponse = {
        gender_id: resultCapDev.gender_id,
        trainee_name: resultCapDev.trainee_name,
        affiliation: institution,
        nationality: nationality,
      };
    }

    const trainingSupervisor = await this._resultUserService
      .findUsersByRoleResult(
        UserRolesEnum.TRAINING_SUPERVISOR,
        resultCapDev.result_id,
      )
      .then((user) => (user && user.length > 0 ? user[0] : null));

    const training_supervisor_languages = await this._resultLanguageService
      .findLanguageByRoleResult(
        LanguageRolesEnum.TRAINING_SUPERVISOR,
        resultCapDev.result_id,
      )
      .then((language) =>
        language && language.length > 0 ? language[0] : null,
      );

    const response: UpdateResultCapacitySharingDto = {
      delivery_modality_id: resultCapDev.delivery_modality_id,
      end_date: resultCapDev.end_date,
      session_format_id: resultCapDev.session_format_id,
      session_type_id: resultCapDev.session_type_id,
      start_date: resultCapDev.start_date,
      degree_id:
        resultCapDev.session_length_id == 2 ? resultCapDev.degree_id : null,
      session_length_id: resultCapDev.session_length_id,
      group: groupResponse,
      individual: individualResponse,
      training_supervisor: trainingSupervisor,
      training_supervisor_languages: training_supervisor_languages,
      created_at: resultCapDev.created_at,
      updated_at: resultCapDev.updated_at,
    };

    return response;
  }
}
