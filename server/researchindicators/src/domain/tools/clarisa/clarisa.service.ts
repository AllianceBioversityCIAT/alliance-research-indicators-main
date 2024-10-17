import { Injectable, Logger } from '@nestjs/common';
import { Clarisa } from './clarisa.connection';
import { HttpService } from '@nestjs/axios';
import { ClarisaPathEnum } from './anum/path.enum';
import { DataSource, DeepPartial } from 'typeorm';
import { ClarisaLanguage } from './entities/clarisa-languages/entities/clarisa-language.entity';
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

@Injectable()
export class ClarisaService {
  private connection: Clarisa;
  private readonly _logger: Logger = new Logger(ClarisaService.name);

  constructor(
    private dataSource: DataSource,
    private readonly ciService: ClarisaInstitutionsService,
    private readonly _http: HttpService,
  ) {
    this.connection = new Clarisa(this._http);
  }

  /**
   *
   * @param path Path to fetch data from Clarisa API
   * @param entity Entity to save data
   * @param mapper Mapper to modify data
   * @returns Y[] Array of entities
   */
  private async base<T, Y = T>(
    path: string,
    entity: new () => Y,
    mapper?: (data: T) => DeepPartial<Y>,
  ): Promise<Y[]> {
    this._logger.log(`Fetching data from Clarisa API for ${entity.name}`);
    const data: T[] = await this.connection.get<T[]>(path).catch((err) => {
      this._logger.error(
        `Error fetching data from Clarisa API for ${entity.name} path: ${path}`,
      );
      this._logger.error(err);
      return [];
    });
    let modifyData: DeepPartial<Y>[];
    if (mapper) {
      modifyData = data.map((item) => mapper(item));
    } else {
      modifyData = data as unknown as Y[];
    }
    const saveData: Y[] = await this.dataSource
      .getRepository(entity)
      .save(modifyData)
      .then((data) => {
        this._logger.log(`Data saved for ${entity.name}`);
        return data;
      });

    return saveData;
  }

  /**
   * Clone all entities from Clarisa API
   * @returns void
   * @description This method clones all entities from Clarisa API
   * @public
   */
  async cloneAllClarisaEntities(): Promise<void> {
    this._logger.debug('Cloning all entities from Clarisa API');
    await this.base<ClarisaLanguage>(
      ClarisaPathEnum.LANGUAGES,
      ClarisaLanguage,
    );

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
    await this.base<ClarisaLever, ClarisaLever>(
      ClarisaPathEnum.LEVERS,
      ClarisaLever,
    );
    this._logger.debug('All entities cloned');
  }
}
