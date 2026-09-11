import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaInnovationUseLevelsService } from './clarisa-innovation-use-levels.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

describe('ClarisaInnovationUseLevelsService', () => {
  let service: ClarisaInnovationUseLevelsService;
  const mockFind = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaInnovationUseLevelsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: mockFind,
              findOne: jest.fn(),
              save: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              createQueryBuilder: jest.fn(),
              metadata: { columns: [], relations: [] },
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: {} },
      ],
    }).compile();

    service = module.get<ClarisaInnovationUseLevelsService>(
      ClarisaInnovationUseLevelsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // R-IUA-010 AC.3, AC.4 + scenario "Scale order does not rest on a
  // coincidence" (design.md DD-6). This is the falsifying assertion: delete
  // the `order` override and this test fails, even though `id = level + 1`
  // on the seeded catalog would still make an end-to-end 0..9 read pass by
  // coincidence of primary-key order.
  describe('findAll', () => {
    it('requests active rows ordered by level ASC when no where clause is supplied', async () => {
      mockFind.mockResolvedValue([]);

      await service.findAll();

      expect(mockFind).toHaveBeenCalledWith({
        where: { is_active: true },
        relations: {},
        order: { level: 'ASC' },
      });
    });

    it('still carries the order clause when a custom where clause is supplied', async () => {
      mockFind.mockResolvedValue([]);

      await service.findAll({}, { is_active: true, level: 5 } as any);

      expect(mockFind).toHaveBeenCalledWith({
        where: { is_active: true, level: 5 },
        relations: {},
        order: { level: 'ASC' },
      });
    });

    it('returns the rows resolved by the repository', async () => {
      const rows = [
        { id: 1, level: 0, name: 'Idea', definition: 'd0' },
        { id: 2, level: 1, name: 'Basic research', definition: 'd1' },
      ];
      mockFind.mockResolvedValue(rows);

      const result = await service.findAll();

      expect(result).toEqual(rows);
    });
  });
});
