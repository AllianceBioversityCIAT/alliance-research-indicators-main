import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultCountriesService } from './result-countries.service';
import { ResultCountry } from './entities/result-country.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { CountryRolesEnum } from '../country-roles/enums/country-roles.anum';

describe('ResultCountriesService', () => {
  let service: ResultCountriesService;
  const findOne = jest.fn();
  const find = jest.fn();

  const mockRepository = {
    findOne,
    find,
    metadata: {
      primaryColumns: [{ propertyName: 'result_country_id' }],
    },
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
  };

  const mockCurrentUser = { user_id: 1, audit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultCountriesService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<ResultCountriesService>(ResultCountriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneCountryByRoleResult', () => {
    it('should query by result, role and active flag', async () => {
      const row = { result_country_id: 1 } as ResultCountry;
      findOne.mockResolvedValue(row);

      const out = await service.findOneCountryByRoleResult(
        3,
        CountryRolesEnum.TRAINEE_NATIONALITY,
      );

      expect(findOne).toHaveBeenCalledWith({
        where: {
          country_role_id: CountryRolesEnum.TRAINEE_NATIONALITY,
          result_id: 3,
          is_active: true,
        },
      });
      expect(out).toBe(row);
    });
  });

  describe('comparerClientToServerCountry', () => {
    it('should merge client list with server state by isoAlpha2', async () => {
      const server = [
        { result_country_id: 1, isoAlpha2: 'CO', result_id: 7 },
      ] as ResultCountry[];
      find.mockResolvedValue(server);

      const client = [{ isoAlpha2: 'CO' }, { isoAlpha2: 'EC' }] as ResultCountry[];

      const out = await service.comparerClientToServerCountry(7, client);

      expect(find).toHaveBeenCalledWith({
        where: { result_id: 7, is_active: true },
      });
      expect(Array.isArray(out)).toBe(true);
      expect(out.length).toBeGreaterThan(0);
    });
  });
});
