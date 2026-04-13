import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultSdgsService } from './result-sdgs.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultSdgsService', () => {
  let service: ResultSdgsService;
  const mockFind = jest.fn();
  const mockSave = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultSdgsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: mockFind,
              findOne: jest.fn(),
              save: mockSave,
              update: jest.fn(),
              metadata: { primaryColumns: [{ propertyName: 'result_id' }] },
            }),
          },
        },
        {
          provide: CurrentUserUtil,
          useValue: { audit: jest.fn().mockReturnValue({ updated_by: 1 }) },
        },
      ],
    }).compile();

    service = module.get<ResultSdgsService>(ResultSdgsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 95
  describe('saveSdgAi', () => {
    it('should merge existing sdgs with new ones and call create', async () => {
      const existingSdgs = [{ result_id: 10, clarisa_sdg_id: 1 }];
      mockFind.mockResolvedValue(existingSdgs);

      const createSpy = jest.spyOn(service as any, 'create').mockResolvedValue([]);

      const newSdgs = [{ clarisa_sdg_id: 2 }] as any;

      await service.saveSdgAi(10, newSdgs);

      expect(mockFind).toHaveBeenCalledWith({
        where: { result_id: 10, is_active: true },
      });
      expect(createSpy).toHaveBeenCalledWith(
        10,
        expect.arrayContaining([
          expect.objectContaining({ clarisa_sdg_id: 1 }),
          expect.objectContaining({ clarisa_sdg_id: 2 }),
        ]),
        'clarisa_sdg_id',
        undefined,
        undefined,
      );
    });

    it('should filter out sdgs without clarisa_sdg_id', async () => {
      mockFind.mockResolvedValue([]);
      const createSpy = jest.spyOn(service as any, 'create').mockResolvedValue([]);

      const newSdgs = [{ clarisa_sdg_id: null }, { clarisa_sdg_id: 3 }] as any;

      await service.saveSdgAi(10, newSdgs);

      const calledWith = createSpy.mock.calls[0][1] as any[];
      const filtered = calledWith.filter((s: any) => s.clarisa_sdg_id === null);
      expect(filtered).toHaveLength(0);
    });
  });
});
