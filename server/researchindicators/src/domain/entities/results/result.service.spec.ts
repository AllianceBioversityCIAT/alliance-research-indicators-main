import { Test, TestingModule } from '@nestjs/testing';
import { ResultsService } from './results.service';
import { OrmConfigTestModule } from '../../../db/config/mysql/orm-connection-test.module';
import { GlobalUtilsModule } from '../../shared/utils/global-utils.module';
import { ResultRepository } from './repositories/result.repository';
import { ResultKeywordsModule } from '../result-keywords/result-keywords.module';
import { ResultLeversModule } from '../result-levers/result-levers.module';
import { ResultContractsModule } from '../result-contracts/result-contracts.module';
import { ResultUsersModule } from '../result-users/result-users.module';
import { ResultCapacitySharingModule } from '../result-capacity-sharing/result-capacity-sharing.module';
import { ReportYearModule } from '../report-year/report-year.module';
import { ResultPolicyChangeModule } from '../result-policy-change/result-policy-change.module';
import { ResultRegionsModule } from '../result-regions/result-regions.module';
import { ResultCountriesModule } from '../result-countries/result-countries.module';
import { ResultCountriesSubNationalsModule } from '../result-countries-sub-nationals/result-countries-sub-nationals.module';
import { ClarisaGeoScopeModule } from '../../tools/clarisa/entities/clarisa-geo-scope/clarisa-geo-scope.module';
import { ResultOpenSearchModule } from '../../tools/open-search/results/result.opensearch.module';
import { AiRoarMiningApp } from '../../tools/broker/ai-roar-mining.app';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Result } from './entities/result.entity';
import { CreateResultDto } from './dto/create-result.dto';
import { ResultStatus } from '../result-status/entities/result-status.entity';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { UpdateGeneralInformation } from './dto/update-general-information.dto';
import { ResultUser } from '../result-users/entities/result-user.entity';
import { ResultAlignmentDto } from './dto/result-alignment.dto';
import { ResultContract } from '../result-contracts/entities/result-contract.entity';
import { ResultLever } from '../result-levers/entities/result-lever.entity';
import { SaveGeoLocationDto } from './dto/save-geo-location.dto';
import { ClarisaGeoScopeEnum } from '../../tools/clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { ResultCountry } from '../result-countries/entities/result-country.entity';
import { ResultRegion } from '../result-regions/entities/result-region.entity';
import { ResultsModule } from './results.module';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultService', () => {
  let service: ResultsService;
  let resultRepository: ResultRepository;
  let resultIdGlobal: number;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [OrmConfigTestModule, ResultsModule, GlobalUtilsModule],
    }).compile();

    resultRepository = module.get<ResultRepository>(ResultRepository);
    service = module.get<ResultsService>(ResultsService);
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return an array of results', async () => {
    const results = service.findResults({
      page: 1,
      limit: 10,
      contract_codes: ['A100'],
      contracts: true,
      indicator_code: ['2'],
      indicators: true,
      lever_codes: ['1'],
      levers: true,
      primary_contract: true,
      primary_lever: true,
      result_audit_data: true,
      result_audit_data_objects: true,
      result_status: true,
      sort_order: 'ASC',
      status_codes: ['4'],
      user_codes: ['25'],
      years: ['2025'],
    });
    expect(await results).toBeDefined();
    expect((await results).length).toBeGreaterThan(0);
    await results.then((res) => {
      if (res.length > 0) {
        expect(res[0].result_id).toBeDefined();
        expect(res[0].result_status).toBeDefined();
        expect(res[0].result_levers).toBeDefined();
        expect(res[0].result_contracts).toBeDefined();
        expect(res[0].indicators).toBeDefined();
        expect(res[0].created_by_user).toBeDefined();
        expect(res[0].updated_by_user).toBeDefined();
      }
    });
  });

  it('should create a result', async () => {
    const result = new CreateResultDto();
    result.contract_id = 'A100';
    result.indicator_id = 2;
    result.title = 'Test Result Automation';
    result.description = 'Test Result Automation';

    const newResult = await service.createResult(result);
    expect(newResult).toBeDefined();
    expect(newResult.result_id).toBeDefined();
    expect(newResult.result_status).toBeDefined();
    expect(newResult.indicator_id).toBeDefined();
  });

  it('should save general information of a result', async () => {
    const generalInformation = new UpdateGeneralInformation();
    generalInformation.description = 'Test Result Automation updated';
    generalInformation.keywords = ['Test', 'Result', 'Automation'];
    generalInformation.main_contact_person = {
      user_id: 25,
    } as unknown as ResultUser;
    const result = await service.updateGeneralInfo(
      resultIdGlobal,
      generalInformation,
    );
    expect(result).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.description).toBe('Test Result Automation updated');
    expect(result.keywords).toBeDefined();
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.main_contact_person).toBeDefined();
    expect(result.main_contact_person.user_id).toBe(25);
  });

  it('should return general information of a result', async () => {
    const result = await service.findGeneralInfo(resultIdGlobal);
    expect(result).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.description).toBe('Test Result Automation updated');
    expect(result.keywords).toBeDefined();
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.main_contact_person).toBeDefined();
    expect(result.main_contact_person.user_id).toBe(25);
  });

  it('should update result alignment', async () => {
    const alignment = new ResultAlignmentDto();
    alignment.contracts = [
      {
        contract_id: 'A100',
        is_primary: false,
      },
      {
        contract_id: 'A1029',
        is_primary: true,
      },
    ] as unknown as ResultContract[];

    alignment.levers = [
      {
        lever_id: 1,
        is_primary: true,
      },
      {
        lever_id: 2,
        is_primary: false,
      },
    ] as unknown as ResultLever[];
    const result = await service.updateResultAlignment(
      resultIdGlobal,
      alignment,
    );
    expect(result).toBeDefined();
    expect(result.contracts).toBeDefined();
    expect(result.levers).toBeDefined();
    expect(result.contracts.length).toBeGreaterThan(0);
    expect(result.levers.length).toBeGreaterThan(0);
  });

  it('should return result alignment', async () => {
    const result = await service.findResultAlignment(resultIdGlobal);
    expect(result).toBeDefined();
    expect(result.contracts).toBeDefined();
    expect(result.levers).toBeDefined();
    expect(result.contracts.length).toBeGreaterThan(0);
    expect(result.levers.length).toBeGreaterThan(0);
  });

  it('should return a result metadata', async () => {
    const result = await service.findMetadataResult(resultIdGlobal);
    expect(result).toBeDefined();
    expect(result.result_id).toBeDefined();
    expect(result.status_id).toBeDefined();
    expect(result.indicator_name).toBe('Test Result Automation');
    expect(result.status_name).toBe('Draft');
  });

  it('should save geo scope of a result GLOBAL', async () => {
    const geoScopeSave = new SaveGeoLocationDto();
    geoScopeSave.geo_scope_id = ClarisaGeoScopeEnum.GLOBAL;
    geoScopeSave.countries = [
      { isoAlpha2: 'CO' },
    ] as unknown as ResultCountry[];
    geoScopeSave.regions = [{ region_id: 2 }] as unknown as ResultRegion[];
    const result = await service.saveGeoLocation(resultIdGlobal, geoScopeSave);
    expect(result.geo_scope_id).toBeDefined();
    expect(result.geo_scope_id).toBe(ClarisaGeoScopeEnum.GLOBAL);
    expect(result.countries).toBeDefined();
    expect(result.countries.length).toBeGreaterThan(0);
    expect(result.regions).toBeDefined();
    expect(result.regions.length).toBeGreaterThan(0);
  });

  it('should save geo scope of a result COUNTRY', async () => {
    const geoScopeSave = new SaveGeoLocationDto();
    geoScopeSave.geo_scope_id = ClarisaGeoScopeEnum.NATIONAL;
    geoScopeSave.countries = [
      { isoAlpha2: 'AE' },
    ] as unknown as ResultCountry[];
    const result = await service.saveGeoLocation(resultIdGlobal, geoScopeSave);
    expect(result.geo_scope_id).toBeDefined();
    expect(result.geo_scope_id).toBe(ClarisaGeoScopeEnum.NATIONAL);
    expect(result.countries).toBeDefined();
    expect(result.countries.length).toBeGreaterThan(0);
  });

  it('should save geo scope of a result REGION', async () => {
    const geoScopeSave = new SaveGeoLocationDto();
    geoScopeSave.geo_scope_id = ClarisaGeoScopeEnum.REGIONAL;
    geoScopeSave.regions = [{ region_id: 5 }] as unknown as ResultRegion[];
    const result = await service.saveGeoLocation(resultIdGlobal, geoScopeSave);
    expect(result.geo_scope_id).toBeDefined();
    expect(result.geo_scope_id).toBe(ClarisaGeoScopeEnum.REGIONAL);
    expect(result.regions).toBeDefined();
    expect(result.regions.length).toBeGreaterThan(0);
  });

  it('should save geo scope of a result SUBNATIONAL', async () => {
    const geoScopeSave = new SaveGeoLocationDto();
    geoScopeSave.geo_scope_id = ClarisaGeoScopeEnum.SUB_NATIONAL;
    geoScopeSave.countries = [
      {
        isoAlpha2: 'CO',
        result_countries_sub_nationals: [
          {
            sub_national_id: 866,
          },
        ],
      },
    ] as unknown as ResultCountry[];
    const result = await service.saveGeoLocation(resultIdGlobal, geoScopeSave);
    expect(result.geo_scope_id).toBeDefined();
    expect(result.geo_scope_id).toBe(ClarisaGeoScopeEnum.SUB_NATIONAL);
    expect(result.countries).toBeDefined();
    expect(result.countries.length).toBeGreaterThan(0);
    expect(result.countries?.[0].result_countries_sub_nationals).toBeDefined();
    expect(
      result.countries?.[0]?.result_countries_sub_nationals,
    ).toBeGreaterThan(0);
  });

  it('should return geo scope of a result', async () => {
    const result = await service.findGeoLocation(resultIdGlobal);
    expect(result.geo_scope_id).toBeDefined();
    expect(result.countries).toBeDefined();
    expect(result.regions).toBeDefined();
  });

  it('should find last result update', async () => {
    const result =
      await service.findLastUpdatedResultByCurrentUser(resultIdGlobal);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should delete a result', async () => {
    await service.deleteResult(resultIdGlobal);
    const oldResult = await dataSource.getRepository(Result).findOne({
      where: { result_id: resultIdGlobal },
    });
    expect(oldResult).toBeDefined();
    expect(oldResult.result_status).toBe(ResultStatusEnum.DELETED);
    expect(oldResult.is_active).toBe(false);
  });
});
