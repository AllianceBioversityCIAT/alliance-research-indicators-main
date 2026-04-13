import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AgressoToolsService } from './agresso-tools.service';
import { ClarisaSdg } from '../clarisa/entities/clarisa-sdgs/entities/clarisa-sdg.entity';

describe('AgressoToolsService', () => {
  let service: AgressoToolsService;
  const mockSdgFind = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgressoToolsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockImplementation((entity) => {
              if (entity === ClarisaSdg) {
                return { find: mockSdgFind, save: jest.fn() };
              }
              return { save: jest.fn() };
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AgressoToolsService>(AgressoToolsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 160
  describe('cloneAllAgressoEntities', () => {
    it('should fetch clarisa SDGs and call base with the agresso contracts path', async () => {
      const mockSdgs = [{ id: 1, name: 'No Poverty' }];
      mockSdgFind.mockResolvedValue(mockSdgs);

      const baseSpy = jest
        .spyOn(service as any, 'base')
        .mockResolvedValue([]);

      await service.cloneAllAgressoEntities();

      expect(mockSdgFind).toHaveBeenCalled();
      expect(baseSpy).toHaveBeenCalledWith(
        'getAgreementsRM',
        expect.anything(),
        null,
        expect.any(Function),
      );
    });

    it('should pass iterator that deduplicates by agreement_id', async () => {
      mockSdgFind.mockResolvedValue([]);

      let capturedIterator: ((data: any[]) => any[]) | null = null;
      jest.spyOn(service as any, 'base').mockImplementation(
        (_path, _entity, _mapper, iterator: (data: any[]) => any[]) => {
          capturedIterator = iterator;
          return Promise.resolve([]);
        },
      );

      await service.cloneAllAgressoEntities();

      const duplicateData = [
        { agreement_id: 'C001', name: 'First' },
        { agreement_id: 'C001', name: 'Duplicate' },
        { agreement_id: 'C002', name: 'Unique' },
      ];

      const deduped = capturedIterator!(duplicateData);

      // Only C001 (first occurrence) and C002 should appear
      expect(deduped).toHaveLength(2);
    });
  });
});
