import { Injectable, Logger } from '@nestjs/common';
import { Clarisa } from './clarisa.connection';
import { HttpService } from '@nestjs/axios';
import { ClarisaPathEnum, SearchToOpenSearchEnum } from './anum/path.enum';
import { DataSource } from 'typeorm';
import { ClarisaRegion } from './entities/clarisa-regions/entities/clarisa-region.entity';
import { ClarisaCountry } from './entities/clarisa-countries/entities/clarisa-country.entity';
import { countryMapper } from './mappers/countries.mapper';
import { CreateClarisaCountryDto } from './entities/clarisa-countries/dto/create-clarisa-country.dto';
import { ClarisaInstitutionType } from './entities/clarisa-institution-types/entities/clarisa-institution-type.entity';
import { institutionTypeMapper } from './mappers/institutio-type.mapper';
import { CreateClarisaInstitutionTypeDto } from './entities/clarisa-institution-types/dto/create-clarisa-institution-type.dto';
import { ClarisaInstitution } from './entities/clarisa-institutions/entities/clarisa-institution.entity';
import { institutionMapper } from './mappers/institution.mapper';
import { CreateClarisaInstitutionDto } from './entities/clarisa-institutions/dto/create-clarisa-institution.dto';
import { ClarisaInstitutionsService } from './entities/clarisa-institutions/clarisa-institutions.service';
import { ClarisaLever } from './entities/clarisa-levers/entities/clarisa-lever.entity';
import { BaseControlListSave } from '../../shared/global-dto/base-control-list-save';
import { ClarisaLeversRawDto } from './entities/clarisa-levers/dto/clarisa-levers-raw.dto';
import { leversMappers } from './mappers/levers.mappers';
import { ClarisaSubNationalRawDto } from './entities/clarisa-sub-nationals/dto/clarisa-sub-national-raw.dto';
import { ClarisaSubNational } from './entities/clarisa-sub-nationals/entities/clarisa-sub-national.entity';
import { subNationalMapper } from './mappers/sub-national.mapper';
import { ClarisaGeoScope } from './entities/clarisa-geo-scope/entities/clarisa-geo-scope.entity';
import { PartnerRequestCreate } from '../dto/partner-request-create.dto';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { AppConfig } from '../../shared/utils/app-config.util';
import { PartnerRequestCliDataDto } from '../dto/partner-request-cli-data.dto';
import { CreateSecretDto, MisSimpleInfoDto } from './dto/clarisa.types';

@Injectable()
export class ClarisaService extends BaseControlListSave<Clarisa> {
  constructor(
    dataSource: DataSource,
    private readonly ciService: ClarisaInstitutionsService,
    _http: HttpService,
    private readonly currentUser: CurrentUserUtil,
    private readonly appConfig: AppConfig,
  ) {
    super(dataSource, new Clarisa(_http), new Logger(ClarisaService.name));
  }

  async searchToOS(
    query: string,
    country: string,
    target: SearchToOpenSearchEnum,
  ) {
    let dataSearch: string;
    if (target === SearchToOpenSearchEnum.COUNTRY) {
      dataSearch = ClarisaPathEnum.OS_COUNTRIES;
    } else if (target === SearchToOpenSearchEnum.INSTITUTION) {
      dataSearch = ClarisaPathEnum.OS_INSTITUTIONS;
    } else if (target === SearchToOpenSearchEnum.SUBNATIONAL) {
      dataSearch = ClarisaPathEnum.OS_SUBNATIONAL;
    }
    console.log(dataSearch + `?query=${query}&country=${country}`);
    return this.connection.get(
      dataSearch + `?query=${query}&country=${country}`,
    );
  }

  async partnerRequest(partnerRequest: PartnerRequestCliDataDto) {
    const { email, first_name, last_name, sec_user_id } = this.currentUser.user;
    const fullName = `${last_name}, ${first_name}`;
    return this.connection.post<PartnerRequestCreate, any>(
      ClarisaPathEnum.PARTNER_REQUEST_CREATE,
      {
        externalUserMail: email,
        externalUserName: fullName,
        userId: sec_user_id,
        misAcronym: this.appConfig.ARI_MIS,
        hqCountryIso: partnerRequest.hqCountryIso,
        institutionTypeCode: partnerRequest.institutionTypeCode,
        name: partnerRequest.name,
        websiteLink: partnerRequest.websiteLink,
        category_1: partnerRequest?.category_1,
        category_2: partnerRequest?.category_2,
        externalUserComments: partnerRequest?.externalUserComments,
      },
    );
  }

  /**
   * Clone all entities from Clarisa API
   * @returns void
   * @description This method clones all entities from Clarisa API
   * @public
   */
  async cloneAllClarisaEntities(): Promise<void> {
    this._logger.debug('Cloning all entities from Clarisa API');

    /*await this.base<ClarisaLanguage>(
      ClarisaPathEnum.LANGUAGES,
      ClarisaLanguage,
    );*/

    await this.base<ClarisaRegion>(ClarisaPathEnum.REGIONS, ClarisaRegion);

    await this.base<CreateClarisaCountryDto, ClarisaCountry>(
      ClarisaPathEnum.COUNTRIES,
      ClarisaCountry,
      (data) => countryMapper(data),
    );

    await this.base<CreateClarisaInstitutionTypeDto, ClarisaInstitutionType>(
      ClarisaPathEnum.INSTITUTIONS_TYPES,
      ClarisaInstitutionType,
      (data) => institutionTypeMapper(data),
    );

    const institutionsPath = await this.ciService.clonePath();
    await this.base<CreateClarisaInstitutionDto, ClarisaInstitution>(
      institutionsPath,
      ClarisaInstitution,
      (data) => institutionMapper(data),
    );

    await this.base<ClarisaLeversRawDto, ClarisaLever>(
      ClarisaPathEnum.LEVERS,
      ClarisaLever,
      (data) => leversMappers(data),
    );

    await this.base<ClarisaSubNationalRawDto, ClarisaSubNational>(
      ClarisaPathEnum.SUB_NATIONAL,
      ClarisaSubNational,
      (data) => subNationalMapper(data),
    );

    await this.base<ClarisaGeoScope>(
      ClarisaPathEnum.GEO_SCOPES,
      ClarisaGeoScope,
    );
    this._logger.debug('All entities cloned');
  }

  async createPermission(newMisInfo: MisSimpleInfoDto) {
    const { acronym, environment } = newMisInfo;
    const configData: CreateSecretDto = {
      receiver_mis: {
        acronym: this.appConfig.ARI_MIS,
        environment: this.appConfig.ARI_MIS_ENV,
      },
      sender_mis: {
        acronym,
        environment,
      },
    };
    return this.connection.post(ClarisaPathEnum.CREATE_SECRET, configData);
  }
}
