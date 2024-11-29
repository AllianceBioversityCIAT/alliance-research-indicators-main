import { Injectable, Logger } from '@nestjs/common';
import { Clarisa } from './clarisa.connection';
import { HttpService } from '@nestjs/axios';
import { ClarisaPathEnum } from './anum/path.enum';
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

@Injectable()
export class ClarisaService extends BaseControlListSave<Clarisa> {
  constructor(
    dataSource: DataSource,
    private readonly ciService: ClarisaInstitutionsService,
    _http: HttpService,
  ) {
    super(dataSource, new Clarisa(_http), new Logger(ClarisaService.name));
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
}
