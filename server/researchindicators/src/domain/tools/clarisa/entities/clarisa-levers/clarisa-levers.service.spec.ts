import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClarisaLeversService } from './clarisa-levers.service';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../../../shared/utils/current-user.util';
import { ClarisaLever } from './entities/clarisa-lever.entity';
import { PortfoliosService } from '../../../../entities/portfolios/portfolios.service';
import { AppConfig } from '../../../../shared/utils/app-config.util';
import { CreateClarisaLeverDto } from './dto/clarisa-levers-raw.dto';

describe('ClarisaLeversService', () => {
  let service: ClarisaLeversService;
  const mockFindOne = jest.fn();

  const mockMainFindOne = jest.fn();
  const mockMainSave = jest.fn();
  const mockMainUpdate = jest.fn();
  const mockValidatePortfolio = jest.fn();
  const mockAudit = jest.fn();

  const mockMainRepo = {
    find: jest.fn(),
    findOne: mockMainFindOne,
    save: mockMainSave,
    update: mockMainUpdate,
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
    metadata: { columns: [], relations: [] },
  };

  const mockPortfoliosService = {
    validatePortfolio: mockValidatePortfolio,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAudit.mockImplementation((set: SetAuditEnum) =>
      set === SetAuditEnum.UPDATE ? { updated_by: 42 } : { created_by: 42 },
    );
    mockFindOne.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaLeversService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn(() => mockMainRepo),
          },
        },
        {
          provide: CurrentUserUtil,
          useValue: { audit: mockAudit },
        },
        {
          provide: PortfoliosService,
          useValue: mockPortfoliosService,
        },
        {
          provide: AppConfig,
          useValue: { BUCKET_URL: 'https://bucket.example' },
        },
      ],
    }).compile();

    service = module.get<ClarisaLeversService>(ClarisaLeversService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllWithPortfolio', () => {
    it('should return active levers filtered by portfolio id', async () => {
      const levers = [{ id: 1, portfolio_id: 2 }] as ClarisaLever[];
      mockMainRepo.find.mockResolvedValue(levers);

      const result = await service.findAllWithPortfolio(2);

      expect(mockMainRepo.find).toHaveBeenCalledWith({
        where: { portfolio_id: 2, is_active: true },
      });
      expect(result).toBe(levers);
    });

    it('should allow undefined portfolio id for unscoped lookup', async () => {
      mockMainRepo.find.mockResolvedValue([]);

      await service.findAllWithPortfolio(undefined);

      expect(mockMainRepo.find).toHaveBeenCalledWith({
        where: { portfolio_id: undefined, is_active: true },
      });
    });
  });

  describe('findActiveByIdsForPortfolio', () => {
    // A genuine predicate evaluator over the fixture list — not a canned
    // return value — so the portfolio-scoping and is_active exclusion cases
    // can actually fail against an implementation that never applies them
    // (KZ-001), matching the standard set in
    // strategic-objectives.service.spec.ts.
    const evaluateWhere = (
      lever: Record<string, any>,
      where: Record<string, any>,
    ): boolean =>
      Object.entries(where).every(([key, condition]) => {
        const actual = lever[key];
        if (condition && typeof condition === 'object' && 'type' in condition) {
          if (condition.type === 'in') {
            return (condition.value as unknown[]).includes(actual);
          }
          throw new Error(
            `Unsupported FindOperator type in test double: ${condition.type}`,
          );
        }
        return actual === condition;
      });

    const fakeFind = (fixtures: Record<string, any>[]) =>
      jest.fn(async ({ where }: any) =>
        fixtures.filter((lever) => evaluateWhere(lever, where)),
      );

    it('returns [] without querying when ids is empty', async () => {
      const result = await service.findActiveByIdsForPortfolio([], 2);

      expect(result).toEqual([]);
      expect(mockMainRepo.find).not.toHaveBeenCalled();
    });

    it('returns only ids that are active and owned by the given portfolio, discarding a foreign-portfolio id', async () => {
      const fixtures = [
        { id: 11, portfolio_id: 2, is_active: true },
        { id: 12, portfolio_id: 2, is_active: true },
        { id: 4, portfolio_id: 1, is_active: true }, // active, but portfolio-1
      ];
      mockMainRepo.find.mockImplementation(fakeFind(fixtures));

      const result = await service.findActiveByIdsForPortfolio([11, 12, 4], 2);

      expect(mockMainRepo.find).toHaveBeenCalledWith({
        where: {
          id: expect.objectContaining({ type: 'in', value: [11, 12, 4] }),
          portfolio_id: 2,
          is_active: true,
        },
      });
      expect(result).toEqual([
        { id: 11, portfolio_id: 2, is_active: true },
        { id: 12, portfolio_id: 2, is_active: true },
      ]);
    });

    it('discards an id in the right portfolio that is inactive', async () => {
      const fixtures = [{ id: 20, portfolio_id: 2, is_active: false }];
      mockMainRepo.find.mockImplementation(fakeFind(fixtures));

      const result = await service.findActiveByIdsForPortfolio([20], 2);

      expect(result).toEqual([]);
    });

    it('discards an unknown id without throwing', async () => {
      mockMainRepo.find.mockImplementation(fakeFind([]));

      const result = await service.findActiveByIdsForPortfolio([999], 2);

      expect(result).toEqual([]);
    });
  });

  describe('resolveIconUrl', () => {
    it('should resolve icon URL for a known short_name', () => {
      expect(service.resolveIconUrl('Lever 3')).toBe(
        'https://bucket.example/images/levers/L3-Climate-Action_COLOR.png',
      );
    });

    it('should resolve icon URL from a longer lever label prefix', () => {
      expect(service.resolveIconUrl('Lever 3 - Climate Action')).toBe(
        'https://bucket.example/images/levers/L3-Climate-Action_COLOR.png',
      );
    });

    it('should return null for unknown levers', () => {
      expect(service.resolveIconUrl('UnknownLever')).toBeNull();
    });
  });

  describe('homologatedData', () => {
    it.each([
      ['L1', 'Lever 1'],
      ['L2', 'Lever 2'],
      ['L3', 'Lever 3'],
      ['L4', 'Lever 4'],
      ['L5', 'Lever 5'],
      ['L6', 'Lever 6'],
      ['L7', 'Lever 7'],
      ['L8', 'Lever 8'],
    ])('should map "%s" to "%s"', (input, expected) => {
      expect(service.homologatedData(input)).toBe(expected);
    });

    it('should be case-insensitive', () => {
      expect(service.homologatedData('l1')).toBe('Lever 1');
      expect(service.homologatedData('L3')).toBe('Lever 3');
    });

    it('should trim whitespace before lookup', () => {
      expect(service.homologatedData('  L2  ')).toBe('Lever 2');
    });

    it('should return null for unknown keys', () => {
      expect(service.homologatedData('L99')).toBeNull();
      expect(service.homologatedData('Unknown')).toBeNull();
    });

    it('should return null when input is null or undefined', () => {
      expect(service.homologatedData(null)).toBeNull();
      expect(service.homologatedData(undefined)).toBeNull();
    });
  });

  describe('create', () => {
    const dto: CreateClarisaLeverDto = {
      portfolio_id: 1,
      full_name: 'Lever 1',
      short_name: 'L1',
      other_names: 'Alias',
    };

    it('should save a lever when portfolio exists and name fields are present', async () => {
      const saved = { id: 10, ...dto } as ClarisaLever;
      mockValidatePortfolio.mockResolvedValue({ id: 1 });
      mockMainSave.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(mockValidatePortfolio).toHaveBeenCalledWith(dto.portfolio_id);
      expect(mockAudit).toHaveBeenCalledWith(SetAuditEnum.NEW);
      expect(mockMainSave).toHaveBeenCalledWith({
        full_name: dto.full_name,
        other_names: dto.other_names,
        short_name: dto.short_name,
        portfolio_id: dto.portfolio_id,
        created_by: 42,
      });
      expect(result).toBe(saved);
    });

    it('should throw BadRequestException when portfolio is not found', async () => {
      mockValidatePortfolio.mockRejectedValue(
        new BadRequestException('Portfolio not found'),
      );

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow('Portfolio not found');
      expect(mockMainSave).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when no name fields are provided', async () => {
      mockValidatePortfolio.mockResolvedValue({ id: 1 });

      await expect(
        service.create({ portfolio_id: 1 } as CreateClarisaLeverDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockMainSave).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const dto: CreateClarisaLeverDto = {
      portfolio_id: 2,
      full_name: 'Updated lever',
      short_name: 'L2',
    };

    it('should update a lever when it and its portfolio exist', async () => {
      const updated = { id: 5, ...dto } as ClarisaLever;
      mockMainFindOne
        .mockResolvedValueOnce({ id: 5 })
        .mockResolvedValueOnce(updated);
      mockValidatePortfolio.mockResolvedValue({ id: 2 });
      mockMainUpdate.mockResolvedValue({ affected: 1 });

      const result = await service.update(5, dto);

      expect(mockMainFindOne).toHaveBeenNthCalledWith(1, { where: { id: 5 } });
      expect(mockValidatePortfolio).toHaveBeenCalledWith(dto.portfolio_id);
      expect(mockAudit).toHaveBeenCalledWith(SetAuditEnum.UPDATE);
      expect(mockMainUpdate).toHaveBeenCalledWith(5, {
        full_name: dto.full_name,
        other_names: dto.other_names,
        short_name: dto.short_name,
        portfolio_id: dto.portfolio_id,
        updated_by: 42,
      });
      expect(result).toBe(updated);
    });

    it('should throw BadRequestException when lever is not found', async () => {
      mockMainFindOne.mockResolvedValue(null);

      await expect(service.update(5, dto)).rejects.toThrow(
        'Clarisa lever not found',
      );
      expect(mockMainUpdate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when no name fields are provided', async () => {
      mockMainFindOne.mockResolvedValue({ id: 5 });

      await expect(
        service.update(5, { portfolio_id: 1 } as CreateClarisaLeverDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockMainUpdate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when portfolio is not found', async () => {
      mockMainFindOne.mockResolvedValue({ id: 5 });
      mockValidatePortfolio.mockRejectedValue(
        new BadRequestException('Portfolio not found'),
      );

      await expect(service.update(5, dto)).rejects.toThrow(
        'Portfolio not found',
      );
      expect(mockMainUpdate).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft-delete a lever by setting is_active to false', async () => {
      mockMainFindOne.mockResolvedValue({ id: 3 });
      mockMainUpdate.mockResolvedValue({ affected: 1 });

      const result = await service.remove(3);

      expect(mockMainFindOne).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(mockMainUpdate).toHaveBeenCalledWith(3, { is_active: false });
      expect(result).toBe(3);
    });

    it('should throw BadRequestException when lever is not found', async () => {
      mockMainFindOne.mockResolvedValue(null);

      await expect(service.remove(3)).rejects.toThrow(
        'Clarisa lever not found',
      );
      expect(mockMainUpdate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when update affects zero rows', async () => {
      mockMainFindOne.mockResolvedValue({ id: 3 });
      mockMainUpdate.mockResolvedValue({ affected: 0 });

      await expect(service.remove(3)).rejects.toThrow(
        'Clarisa lever not found',
      );
    });
  });

  describe('findByShortName', () => {
    it('should return a lever matching the given short_name', async () => {
      const lever = { id: 1, short_name: 'Lever 1' } as ClarisaLever;
      mockMainFindOne.mockResolvedValue(lever);

      const result = await service.findByShortName('Lever 1');

      expect(mockMainFindOne).toHaveBeenCalledWith({
        where: { short_name: 'Lever 1' },
      });
      expect(result).toBe(lever);
    });
  });
});
