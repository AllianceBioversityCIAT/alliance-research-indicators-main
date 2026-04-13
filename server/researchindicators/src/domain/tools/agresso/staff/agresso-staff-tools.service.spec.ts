import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { DataSource } from 'typeorm';
import { AgressoStaffToolsService } from './agresso-staff-tools.service';

describe('AgressoStaffToolsService', () => {
  let service: AgressoStaffToolsService;
  let mockConnection: { getRaw: jest.Mock };

  beforeEach(async () => {
    mockConnection = { getRaw: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgressoStaffToolsService,
        { provide: HttpService, useValue: { get: jest.fn() } },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({ save: jest.fn() }),
          },
        },
      ],
    }).compile();

    service = module.get<AgressoStaffToolsService>(AgressoStaffToolsService);
    (service as any).connection = mockConnection;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 161
  describe('cloneAllAgressoStaff', () => {
    it('should call base once per page when totalElements fits exactly in 1000-item pages', async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 2000 });
      const baseSpy = jest
        .spyOn(service as any, 'base')
        .mockResolvedValue([]);

      await service.cloneAllAgressoStaff();

      expect(baseSpy).toHaveBeenCalledTimes(2);
    });

    it('should compute pages with round + remainder (1500 -> 3 calls)', async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 1500 });
      const baseSpy = jest
        .spyOn(service as any, 'base')
        .mockResolvedValue([]);

      await service.cloneAllAgressoStaff();

      expect(baseSpy).toHaveBeenCalledTimes(3);
    });

    it('should call base with the correct query for each page', async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 1000 });
      const baseSpy = jest
        .spyOn(service as any, 'base')
        .mockResolvedValue([]);

      await service.cloneAllAgressoStaff();

      expect(baseSpy).toHaveBeenCalledWith(
        'ErpEmploymentServices/api/v1/employees?page=1&pageSize=1000',
        expect.anything(),
        expect.any(Function),
      );
    });

    it('should not call base when totalElements is 0', async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 0 });
      const baseSpy = jest
        .spyOn(service as any, 'base')
        .mockResolvedValue([]);

      await service.cloneAllAgressoStaff();

      expect(baseSpy).not.toHaveBeenCalled();
    });
  });
});
