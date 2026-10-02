import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { TempResultExternalOicr } from './entities/temp_result_external_oicr.entity';
import { DataSource, In, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { TempExternalOicr } from './entities/temp_external_oicr.entity';
import { CreateResultOicrDto } from '../result-oicr/dto/create-result-oicr.dto';
import { ResultLever } from '../result-levers/entities/result-lever.entity';
import { ResultCountry } from '../result-countries/entities/result-country.entity';
import { ResultRegion } from '../result-regions/entities/result-region.entity';
import { SaveGeoLocationDto } from '../results/dto/save-geo-location.dto';
import { ResultUser } from '../result-users/entities/result-user.entity';
import { StepOneOicrDto } from '../result-oicr/dto/step-one-oicr.dto';
import { StepTwoOicrDto } from '../result-oicr/dto/step-two-oicr.dto';
import { ExternalOicrSourceEnum } from './enum/external-oicr-source.enum';
import { AppConfigKey } from '../app-config/enum/app-config-key.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { CountryRolesEnum } from '../country-roles/enums/country-roles.anum';
import { LeverRolesEnum } from '../lever-roles/enum/lever-roles.enum';
import { ClarisaGeoScopeEnum } from '../../tools/clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { Result } from '../results/entities/result.entity';
import { ResultOicr } from '../result-oicr/entities/result-oicr.entity';
import { ResultCountriesSubNational } from '../result-countries-sub-nationals/entities/result-countries-sub-national.entity';
import { ResultStatus } from '../result-status/entities/result-status.entity';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';

/** Used when `OICR.REPORTING_YEAR` is missing or not a year. Mirrors the client default. */
export const DEFAULT_OICR_REPORTING_YEAR = 2026;

/** Status of an option, shaped like `results.result_status` so the client renders the same tag. */
export type ExistingOicrStatus = Pick<
  ResultStatus,
  'result_status_id' | 'name' | 'description' | 'config'
>;

/** One option of the "Select existing OICR" list, whichever table it comes from. */
export interface ExistingOicrOption {
  id: number;
  source: ExternalOicrSourceEnum;
  title: string;
  external_id: string;
  /** `result_oicrs.oicr_internal_code`; null when the row has none (every TEMP row). */
  oicr_internal_code: string | null;
  maturity_level: string;
  report_year: string;
  /** Status name (text); kept for search and as a fallback label. */
  result_status: string;
  /** Status with its display config (colors, icon); null when it cannot be resolved. */
  status: ExistingOicrStatus | null;
  handle_link: string;
}

@Injectable()
export class TempExternalOicrsService extends BaseServiceSimple<
  TempResultExternalOicr,
  Repository<TempResultExternalOicr>
> {
  private readonly exteralRepo: Repository<TempExternalOicr>;
  constructor(
    private readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      TempResultExternalOicr,
      dataSource.getRepository(TempResultExternalOicr),
      'result_id',
      currentUser,
    );
    this.exteralRepo = dataSource.getRepository(TempExternalOicr);
  }

  /**
   * Options for "Select existing OICR": every active TEMP_external_oicrs row (2024 and
   * earlier) plus every OICR in `results` reported BEFORE the OICR reporting year
   * (OICR.REPORTING_YEAR) — OICRs of that same year are not offered.
   */
  async findExternalOicrs(): Promise<ExistingOicrOption[]> {
    const [external, results, statuses] = await Promise.all([
      this.exteralRepo.find({
        where: {
          is_active: true,
        },
      }),
      this.findResultOicrs(),
      this.findStatusesById(),
    ]);

    return [
      ...external.map((oicr) => ({
        ...oicr,
        source: ExternalOicrSourceEnum.EXTERNAL,
        // TEMP_external_oicrs has no internal code column; only `results` rows can have one.
        oicr_internal_code: null,
        // TEMP rows only carry a status name; every one of them is a published OICR.
        status:
          oicr.result_status?.trim().toLowerCase() === 'published'
            ? (statuses.get(ResultStatusEnum.PUBLISHED) ?? null)
            : null,
      })),
      ...results.map(({ result_status_id, ...oicr }) => ({
        ...oicr,
        status: statuses.get(Number(result_status_id)) ?? null,
      })),
    ];
  }

  private async findStatusesById(): Promise<Map<number, ExistingOicrStatus>> {
    const statuses = await this.dataSource.getRepository(ResultStatus).find({
      select: ['result_status_id', 'name', 'description', 'config'],
    });
    return new Map(
      statuses.map((status) => [Number(status.result_status_id), status]),
    );
  }

  private async findResultOicrs(): Promise<
    (Omit<ExistingOicrOption, 'status'> & { result_status_id: number })[]
  > {
    const reportingYear = await this.findOicrReportingYear();
    const rows: (Omit<ExistingOicrOption, 'status'> & {
      result_status_id: number;
    })[] = await this.dataSource.query(
      `SELECT r.result_id AS id,
              ? AS source,
              r.title,
              CAST(r.result_official_code AS CHAR) AS external_id,
              ro.oicr_internal_code,
              CAST(ro.maturity_level_id AS CHAR) AS maturity_level,
              CAST(r.report_year_id AS CHAR) AS report_year,
              r.result_status_id,
              rs.name AS result_status,
              ro.cgspace_link AS handle_link
         FROM results r
         INNER JOIN result_oicrs ro ON ro.result_id = r.result_id
         LEFT JOIN result_status rs ON rs.result_status_id = r.result_status_id
        WHERE r.indicator_id = ?
          AND r.is_active = TRUE
          AND r.is_snapshot = FALSE
          AND r.report_year_id < ?
        ORDER BY r.report_year_id DESC, r.result_official_code DESC`,
      [ExternalOicrSourceEnum.RESULT, IndicatorsEnum.OICR, reportingYear],
    );
    return rows.map((row) => ({ ...row, id: Number(row.id) }));
  }

  private async findOicrReportingYear(): Promise<number> {
    const rows: { simple_value: string | null }[] = await this.dataSource.query(
      'SELECT simple_value FROM app_config WHERE `key` = ? AND is_active = TRUE LIMIT 1',
      [AppConfigKey.OICR_REPORTING_YEAR],
    );
    const year = Number(rows?.[0]?.simple_value?.trim());
    return Number.isInteger(year) && year > 1900
      ? year
      : DEFAULT_OICR_REPORTING_YEAR;
  }

  async mappingExternalOicrs(
    externalOicrsId: number,
    source: ExternalOicrSourceEnum = ExternalOicrSourceEnum.EXTERNAL,
  ) {
    if (source === ExternalOicrSourceEnum.RESULT) {
      return this.mappingResultOicr(externalOicrsId);
    }

    const preLoad: CreateResultOicrDto = new CreateResultOicrDto();

    const resExternal = await this.exteralRepo.findOne({
      where: {
        id: externalOicrsId,
      },
    });

    const leverList: Partial<ResultLever>[] = resExternal?.lever_list
      ?.split(';')
      .map((item) => ({
        lever_id: item.trim(),
      }));

    const mainContactPerson: ResultUser = resExternal?.main_contact_person_list
      ?.split(';')
      .map((item) => ({
        user_id: item.trim(),
      }))
      ?.at(0) as ResultUser;

    const geoLocation: SaveGeoLocationDto = new SaveGeoLocationDto();

    geoLocation.countries = resExternal?.country_list
      ?.split(';')
      .map((item) => ({
        isoAlpha2: item.trim(),
      })) as ResultCountry[];

    geoLocation.regions = resExternal?.region_list?.split(';').map((item) => ({
      region_id: parseInt(item.trim()),
    })) as ResultRegion[];

    geoLocation.geo_scope_id = resExternal?.geo_scope_id;
    geoLocation.comment_geo_scope = resExternal?.geo_scope_comment;

    preLoad.step_one = {
      main_contact_person: mainContactPerson,
      outcome_impact_statement: resExternal?.elaboration_narrative,
    } as StepOneOicrDto;
    preLoad.step_two = { contributor_lever: leverList } as StepTwoOicrDto;
    preLoad.step_three = geoLocation;
    preLoad.extra_info = {
      maturity_level: parseInt(resExternal?.maturity_level),
    };

    return preLoad;
  }

  /**
   * Same prefill contract as the TEMP rows, read from an OICR stored in `results`:
   * outcome statement, main contact person, contributing levers and geographic scope
   * (including sub-national levels, in the shape `findGeoLocation` returns).
   */
  private async mappingResultOicr(resultId: number) {
    const preLoad: CreateResultOicrDto = new CreateResultOicrDto();

    const [result, oicr, mainContact, levers, countries, regions] =
      await Promise.all([
        this.dataSource.getRepository(Result).findOne({
          where: { result_id: resultId, is_active: true },
          select: {
            result_id: true,
            geo_scope_id: true,
            comment_geo_scope: true,
          },
        }),
        this.dataSource.getRepository(ResultOicr).findOne({
          where: { result_id: resultId, is_active: true },
        }),
        this.dataSource.getRepository(ResultUser).findOne({
          where: {
            result_id: resultId,
            user_role_id: UserRolesEnum.MAIN_CONTACT,
            is_active: true,
          },
        }),
        this.dataSource.getRepository(ResultLever).find({
          where: {
            result_id: resultId,
            lever_role_id: LeverRolesEnum.ALIGNMENT,
            is_active: true,
          },
        }),
        this.dataSource.getRepository(ResultCountry).find({
          where: {
            result_id: resultId,
            country_role_id: CountryRolesEnum.GEO_lOCATION,
            is_active: true,
          },
        }),
        this.dataSource.getRepository(ResultRegion).find({
          where: { result_id: resultId, is_active: true },
        }),
      ]);

    const subNationals = countries.length
      ? await this.dataSource.getRepository(ResultCountriesSubNational).find({
          where: {
            result_country_id: In(countries.map((c) => c.result_country_id)),
            is_active: true,
          },
          relations: { sub_national: true },
        })
      : [];

    const geoLocation: SaveGeoLocationDto = new SaveGeoLocationDto();
    // Stored MULTI_NATIONAL is shown as NATIONAL by the client (findGeoLocation does the same).
    geoLocation.geo_scope_id =
      result?.geo_scope_id === ClarisaGeoScopeEnum.MULTI_NATIONAL
        ? ClarisaGeoScopeEnum.NATIONAL
        : result?.geo_scope_id;
    geoLocation.comment_geo_scope = result?.comment_geo_scope;
    geoLocation.countries = countries.map((country) => ({
      isoAlpha2: country.isoAlpha2,
      result_countries_sub_nationals: subNationals.filter(
        (sub) => sub.result_country_id === country.result_country_id,
      ),
    })) as ResultCountry[];
    geoLocation.regions = regions.map((region) => ({
      region_id: region.region_id,
    })) as ResultRegion[];

    preLoad.step_one = {
      main_contact_person: mainContact
        ? ({ user_id: mainContact.user_id } as ResultUser)
        : undefined,
      outcome_impact_statement: oicr?.outcome_impact_statement,
    } as StepOneOicrDto;
    preLoad.step_two = {
      contributor_lever: levers.map((lever) => ({ lever_id: lever.lever_id })),
    } as StepTwoOicrDto;
    preLoad.step_three = geoLocation;
    preLoad.extra_info = {
      maturity_level: oicr?.maturity_level_id,
    };

    return preLoad;
  }
}
