import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultCapacitySharing } from './entities/result-capacity-sharing.entity';
import { selectManager } from '../../shared/utils/orm.util';
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
import { ResultsService } from '../results/results.service';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
@Injectable()
export class ResultCapacitySharingService {
  private mainRepo: Repository<ResultCapacitySharing>;
  constructor(
    private dataSource: DataSource,
    private readonly _resultUserService: ResultUsersService,
    private readonly _resultLanguageService: ResultLanguagesService,
    private readonly _resultInsitutionService: ResultInstitutionsService,
    private readonly _resultCountryService: ResultCountriesService,
    @Inject(forwardRef(() => ResultsService))
    private readonly _resultService: ResultsService,
  ) {
    this.mainRepo = dataSource.getRepository(ResultCapacitySharing);
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
    });
    return resultCapSharing;
  }

  async update(resultId: number, updateData: UpdateResultCapacitySharingDto) {
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

      await this._resultLanguageService.create<LanguageRolesEnum>(
        resultId,
        updateData?.training_supervisor_languages,
        'language_id',
        LanguageRolesEnum.TRAINING_SUPERVISOR,
        manager,
      );
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
      session_participants_female: updateData?.session_participants_female,
      session_participants_male: updateData?.session_participants_male,
      session_participants_non_binary:
        updateData?.session_participants_non_binary,
      session_participants_total: updateData?.session_participants_total,
    });

    await this._resultInsitutionService.create<InstitutionRolesEnum>(
      resultId,
      updateData?.trainee_organization_representative,
      'institution_id',
      InstitutionRolesEnum.TRAINEE_ORGANIZATION_REPRESENTATIVE,
      manager,
    );
  }

  private async individualUpdate(
    resultId: number,
    updateData: CapDevIndividualDto,
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultCapacitySharing> = selectManager(
      manager,
      ResultCapacitySharing,
      this.mainRepo,
    );

    await entityManager.update(resultId, {
      session_length_id: updateData?.session_length_id,
      trainee_name: updateData?.trainee_name,
      degree_id: updateData?.degree_id,
      gender_id: updateData?.gender_id,
    });

    await this._resultInsitutionService.create<InstitutionRolesEnum>(
      resultId,
      updateData?.affiliation,
      'institution_id',
      InstitutionRolesEnum.TRAINEE_AFFILIATION,
      manager,
    );

    await this._resultCountryService.create<CountryRolesEnum>(
      resultId,
      updateData?.nationality,
      'isoAlpha2',
      CountryRolesEnum.TRAINEE_NATIONALITY,
      manager,
    );
  }

  async findByResultId(
    resultId: number,
  ): Promise<Partial<UpdateResultCapacitySharingDto>> {
    const validateIndicator = await this._resultService.validateIndicator(
      resultId,
      IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    );
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
        await this._resultInsitutionService.findInstitutionsByRoleResult(
          resultCapDev.result_id,
          InstitutionRolesEnum.TRAINEE_ORGANIZATION_REPRESENTATIVE,
        );

      groupResponse = {
        is_attending_organization: resultCapDev.is_attending_organization,
        session_participants_female: resultCapDev.session_participants_female,
        session_participants_male: resultCapDev.session_participants_female,
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
        await this._resultInsitutionService.findOneInstitutionByRoleResult(
          resultCapDev.result_id,
          InstitutionRolesEnum.TRAINEE_AFFILIATION,
        );

      const nationality =
        await this._resultCountryService.findOneCountryByRoleResult(
          resultCapDev.result_id,
          CountryRolesEnum.TRAINEE_NATIONALITY,
        );
      individualResponse = {
        degree_id: resultCapDev.degree_id,
        gender_id: resultCapDev.gender_id,
        trainee_name: resultCapDev.trainee_name,
        session_length_id: resultCapDev.session_length_id,
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
      group: groupResponse,
      individual: individualResponse,
      training_supervisor: trainingSupervisor,
      training_supervisor_languages: training_supervisor_languages,
    };

    return response;
  }
}
