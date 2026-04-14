import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ConnectionService } from './connections.service';
import { ClarisaService } from '../../tools/clarisa/clarisa.service';
import { MisSimpleInfoDto } from '../../tools/clarisa/dto/clarisa.types';

describe('ConnectionService', () => {
  let service: ConnectionService;
  const createPermission = jest.fn();

  const mockDataSource = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionService,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: ClarisaService,
          useValue: { createPermission },
        },
      ],
    }).compile();

    service = module.get<ConnectionService>(ConnectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConnection', () => {
    it('should delegate to ClarisaService.createPermission', async () => {
      const mis: MisSimpleInfoDto = {
        acronym: 'TST',
        environment: 'dev',
      };
      const expected = { ok: true };
      createPermission.mockResolvedValue(expected);

      const result = await service.createConnection(mis);

      expect(createPermission).toHaveBeenCalledWith(mis);
      expect(result).toBe(expected);
    });
  });
});
