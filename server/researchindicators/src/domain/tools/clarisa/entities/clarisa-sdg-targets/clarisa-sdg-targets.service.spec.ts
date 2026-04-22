import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, FindOptionsRelations, FindOptionsWhere } from 'typeorm';
import { ClarisaSdgTargetsService } from './clarisa-sdg-targets.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { AppConfig } from '../../../../shared/utils/app-config.util';
import { ClarisaSdgTarget } from './entities/clarisa-sdg-target.entity';

describe('ClarisaSdgTargetsService', () => {
  let service: ClarisaSdgTargetsService;
  const mockFind = jest.fn();
  const mockGetRepository = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetRepository.mockReturnValue({
      find: mockFind,
      findOne: jest.fn(),
      metadata: {
        primaryColumns: [{ propertyName: 'id' }],
        columns: [],
        relations: [],
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaSdgTargetsService,
        {
          provide: DataSource,
          useValue: { getRepository: mockGetRepository },
        },
        { provide: CurrentUserUtil, useValue: {} },
        { provide: AppConfig, useValue: {} },
      ],
    }).compile();

    service = module.get(ClarisaSdgTargetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers ClarisaSdgTarget repository with sdg_target_code as find-by-name key', () => {
    expect(mockGetRepository).toHaveBeenCalledWith(ClarisaSdgTarget);
  });

  it('findAll delegates to repository with active default where', async () => {
    mockFind.mockResolvedValue([]);
    await service.findAll();
    expect(mockFind).toHaveBeenCalledWith({
      where: { is_active: true },
      relations: {},
    });
  });

  it('findAll passes relations and where when provided', async () => {
    mockFind.mockResolvedValue([]);
    const relations: FindOptionsRelations<ClarisaSdgTarget> = {
      clarisa_sdg: true,
    };
    const where: FindOptionsWhere<ClarisaSdgTarget> = {
      is_active: true,
      id: 5,
    };
    await service.findAll(relations, where);
    expect(mockFind).toHaveBeenCalledWith({
      where,
      relations,
    });
  });
});
