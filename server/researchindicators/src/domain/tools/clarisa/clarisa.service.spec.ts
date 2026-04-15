import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { DataSource } from 'typeorm';
import { ClarisaService, ResponseClarisaDtio } from './clarisa.service';
import { ClarisaInstitutionsService } from './entities/clarisa-institutions/clarisa-institutions.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { AppConfig } from '../../shared/utils/app-config.util';
import { ClarisaPathEnum, SearchToOpenSearchEnum } from './anum/path.enum';
import { PartnerRequestCliDataDto } from '../dto/partner-request-cli-data.dto';

describe('ClarisaService', () => {
  let service: ClarisaService;
  let mockConnection: { get: jest.Mock; post: jest.Mock };
  let _currentUser: jest.Mocked<CurrentUserUtil>;
  let ciService: jest.Mocked<ClarisaInstitutionsService>;

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue({ save: jest.fn() }),
  };

  beforeEach(async () => {
    mockConnection = { get: jest.fn(), post: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaService,
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: ClarisaInstitutionsService,
          useValue: { clonePath: jest.fn() },
        },
        {
          provide: CurrentUserUtil,
          useValue: {
            user: {
              email: 'user@example.com',
              first_name: 'John',
              last_name: 'Doe',
              sec_user_id: 1,
            },
          },
        },
        {
          provide: AppConfig,
          useValue: {
            ARI_MIS: 'STAR',
            ARI_MIS_ENV: 'staging',
          },
        },
      ],
    }).compile();

    service = module.get<ClarisaService>(ClarisaService);
    _currentUser = module.get(CurrentUserUtil);
    ciService = module.get(ClarisaInstitutionsService);

    // Replace internal connection with controlled mock
    (service as any).connection = mockConnection;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 162
  describe('searchToOS', () => {
    it('should call connection.get with country path when target is COUNTRY', async () => {
      mockConnection.get.mockResolvedValue([]);

      await service.searchToOS(
        'Colombia',
        'CO',
        SearchToOpenSearchEnum.COUNTRY,
      );

      expect(mockConnection.get).toHaveBeenCalledWith(
        `${ClarisaPathEnum.OS_COUNTRIES}?query=Colombia&country=CO`,
      );
    });

    it('should call connection.get with institution path when target is INSTITUTION', async () => {
      mockConnection.get.mockResolvedValue([]);

      await service.searchToOS(
        'Alliance',
        '',
        SearchToOpenSearchEnum.INSTITUTION,
      );

      expect(mockConnection.get).toHaveBeenCalledWith(
        `${ClarisaPathEnum.OS_INSTITUTIONS}?query=Alliance&country=`,
      );
    });

    it('should call connection.get with subnational path when target is SUBNATIONAL', async () => {
      mockConnection.get.mockResolvedValue([]);

      await service.searchToOS(
        'Antioquia',
        'CO',
        SearchToOpenSearchEnum.SUBNATIONAL,
      );

      expect(mockConnection.get).toHaveBeenCalledWith(
        `${ClarisaPathEnum.OS_SUBNATIONAL}?query=Antioquia&country=CO`,
      );
    });
  });

  // [CLAUDE/DONE] 163
  describe('partnerRequest', () => {
    it('should post to PARTNER_REQUEST_CREATE with user data from currentUser', async () => {
      const mockPartnerReq: PartnerRequestCliDataDto = {
        hqCountryIso: 'CO',
        institutionTypeCode: 5,
        name: 'Alliance',
        websiteLink: 'http://alliance.org',
        acronym: 'CGIAR',
        platformUrl: null,
      } as any;
      mockConnection.post.mockResolvedValue({ id: 999 });

      await service.partnerRequest(mockPartnerReq);

      expect(mockConnection.post).toHaveBeenCalledWith(
        ClarisaPathEnum.PARTNER_REQUEST_CREATE,
        expect.objectContaining({
          externalUserMail: 'user@example.com',
          externalUserName: 'Doe, John',
          userId: 1,
          misAcronym: 'STAR',
          hqCountryIso: 'CO',
          institutionTypeCode: 5,
          name: 'Alliance',
        }),
      );
    });
  });

  // [CLAUDE/DONE] 164
  describe('cloneAllClarisaEntities', () => {
    it('should call base and baseBatches for all entity types', async () => {
      const baseSpy = jest.spyOn(service as any, 'base').mockResolvedValue([]);
      const baseBatchesSpy = jest
        .spyOn(service as any, 'baseBatches')
        .mockResolvedValue([]);
      ciService.clonePath.mockResolvedValue('api/institutions?show=all');
      mockDataSource.getRepository().save.mockResolvedValue([]);

      await service.cloneAllClarisaEntities();

      expect(baseSpy).toHaveBeenCalledWith(
        ClarisaPathEnum.GLOBAL_TARGETS,
        expect.anything(),
      );
      expect(baseSpy).toHaveBeenCalledWith(
        ClarisaPathEnum.COUNTRIES,
        expect.anything(),
        expect.any(Function),
      );
      expect(baseBatchesSpy).toHaveBeenCalledWith(
        'api/institutions?show=all',
        expect.anything(),
        100,
        expect.any(Function),
      );
    });
  });

  // [CLAUDE/DONE] 165
  describe('authorization', () => {
    it('should return valid response when credentials match ARI_MIS and environment', async () => {
      const mockResponse: ResponseClarisaDtio<any> = {
        message: 'OK',
        status: 200,
        response: {
          receiver_mis: { acronym: 'STAR', environment: 'staging' },
        },
      };
      mockConnection.post.mockResolvedValue(mockResponse);

      const result = await service.authorization('client-id', 'secret');

      expect(result.valid).toBe(true);
    });

    it('should return invalid when acronym does not match (error handled by catch)', async () => {
      const mockResponse: ResponseClarisaDtio<any> = {
        message: 'OK',
        status: 200,
        response: {
          receiver_mis: { acronym: 'WRONG', environment: 'staging' },
        },
      };
      mockConnection.post.mockResolvedValue(mockResponse);

      const result = await service.authorization('client-id', 'secret');

      expect(result.valid).toBe(false);
      expect(result.data).toBeNull();
    });

    it('should return invalid response on non-2xx status', async () => {
      const errorResponse: ResponseClarisaDtio<any> = {
        message: 'Unauthorized',
        status: 401,
        response: null,
      };
      mockConnection.post.mockRejectedValue(errorResponse);

      const result = await service.authorization('bad-id', 'bad-secret');

      expect(result.valid).toBe(false);
      expect(result.data).toBeNull();
    });
  });

  // [CLAUDE/DONE] 166
  describe('createPermission', () => {
    it('should post to CREATE_SECRET with receiver and sender mis data', async () => {
      mockConnection.post.mockResolvedValue({ id: 1 });

      await service.createPermission({
        acronym: 'TIP',
        environment: 'production',
      });

      expect(mockConnection.post).toHaveBeenCalledWith(
        ClarisaPathEnum.CREATE_SECRET,
        {
          receiver_mis: { acronym: 'STAR', environment: 'staging' },
          sender_mis: { acronym: 'TIP', environment: 'production' },
        },
      );
    });
  });
});
