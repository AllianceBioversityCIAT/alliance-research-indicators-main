import { Test, TestingModule } from '@nestjs/testing';
import { RoarManagementService } from './roar-management.service';
import { HttpService } from '@nestjs/axios';
import { AppConfig } from '../../shared/utils/app-config.util';
import { of } from 'rxjs';

describe('RoarManagementService', () => {
  let service: RoarManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoarManagementService,
        { provide: HttpService, useValue: { patch: jest.fn() } },
        {
          provide: AppConfig,
          useValue: { ROAR_MANAGEMENT_HOST: 'http://roar.example' },
        },
      ],
    }).compile();

    service = module.get<RoarManagementService>(RoarManagementService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 190
  describe('validateToken', () => {
    it('should call patchRequest and return the ValidJwtResponse from response.data.data', async () => {
      const mockResponse = { isValid: true, user: { sec_user_id: 1 } };
      jest
        .spyOn(service as any, 'patchRequest')
        .mockReturnValue(of({ data: { data: mockResponse } }));

      const result = await service.validateToken('my-token');

      expect((service as any).patchRequest).toHaveBeenCalledWith(
        'api/authorization/validate-token',
        undefined,
        { headers: { 'access-token': 'my-token' } },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should pass the token in the access-token header', async () => {
      const patchSpy = jest
        .spyOn(service as any, 'patchRequest')
        .mockReturnValue(of({ data: { data: { isValid: false } } }));

      await service.validateToken('bearer-abc');

      expect(patchSpy).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        expect.objectContaining({
          headers: { 'access-token': 'bearer-abc' },
        }),
      );
    });
  });
});
