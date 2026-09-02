import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { PortfoliosRepository } from './repositories/portfolios.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { Portfolio } from './entities/portfolio.entity';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

describe('PortfoliosService', () => {
  let service: PortfoliosService;

  const mockSave = jest.fn();
  const mockFind = jest.fn();
  const mockFindOne = jest.fn();
  const mockUpdate = jest.fn();

  const mockRepository = {
    save: mockSave,
    find: mockFind,
    findOne: mockFindOne,
    update: mockUpdate,
  };

  const mockCurrentUser = {
    roles: [] as number[],
    audit: jest.fn().mockReturnValue({ created_by: 1 }),
  };

  const validDates = {
    start_year: 2024,
    end_year: 2024,
  };

  const baseCreateDto: CreatePortfolioDto = {
    name: 'Portfolio A',
    description: 'Description',
    ...validDates,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCurrentUser.roles = [];
    mockCurrentUser.audit.mockReturnValue({ created_by: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfoliosService,
        { provide: PortfoliosRepository, useValue: mockRepository },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<PortfoliosService>(PortfoliosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should save a portfolio with valid data', async () => {
      const saved = { id: 1, ...baseCreateDto } as Portfolio;
      mockSave.mockResolvedValue(saved);

      const result = await service.create(baseCreateDto);

      expect(mockSave).toHaveBeenCalledWith({
        name: 'Portfolio A',
        description: 'Description',
        start_year: validDates.start_year,
        end_year: validDates.end_year,
        created_by: 1,
      });
      expect(result).toBe(saved);
    });

    it('should throw BadRequestException when required date fields are missing', async () => {
      await expect(
        service.create({
          name: 'Portfolio A',
          description: 'Description',
        } as CreatePortfolioDto),
      ).rejects.toThrow(BadRequestException);

      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return only active portfolios', async () => {
      const portfolios = [{ id: 1, name: 'A', is_active: true }];
      mockFind.mockResolvedValue(portfolios);

      const result = await service.findAll();

      expect(mockFind).toHaveBeenCalledWith({
        where: { is_active: true },
      });
      expect(result).toBe(portfolios);
    });
  });

  describe('findOne', () => {
    it('should return an active portfolio by id', async () => {
      const portfolio = { id: 5, name: 'B', is_active: true };
      mockFindOne.mockResolvedValue(portfolio);

      const result = await service.findOne(5);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { id: 5, is_active: true },
      });
      expect(result).toBe(portfolio);
    });
  });

  describe('update', () => {
    const baseDto: UpdatePortfolioDto = {
      name: 'Updated',
      description: 'New description',
      ...validDates,
    };

    beforeEach(() => {
      mockFindOne.mockResolvedValue({ id: 1, name: 'Existing' });
      mockCurrentUser.audit.mockReturnValue({ updated_by: 2 });
    });

    it('should throw BadRequestException when portfolio is not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(service.update(1, baseDto)).rejects.toThrow(
        'Portfolio not found',
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when required date fields are missing', async () => {
      await expect(
        service.update(1, {
          name: 'Updated',
          description: 'New description',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should update name and description without dates for non-admin users', async () => {
      mockCurrentUser.roles = [SecRolesEnum.TECHNICAL_SUPPORT];
      mockUpdate.mockResolvedValue({ affected: 1 });
      mockFindOne
        .mockResolvedValueOnce({ id: 1, name: 'Existing' })
        .mockResolvedValueOnce({ id: 1, name: 'Updated' });

      await service.update(1, baseDto);

      expect(mockUpdate).toHaveBeenCalledWith(1, {
        name: 'Updated',
        description: 'New description',
        updated_by: 2,
      });
    });

    it('should include dates when user is system admin', async () => {
      mockCurrentUser.roles = [SecRolesEnum.SYSTEM_ADMIN];
      mockUpdate.mockResolvedValue({ affected: 1 });
      mockFindOne
        .mockResolvedValueOnce({ id: 1, name: 'Existing' })
        .mockResolvedValueOnce({ id: 1, name: 'Updated' });

      await service.update(1, baseDto);

      expect(mockUpdate).toHaveBeenCalledWith(1, {
        name: 'Updated',
        description: 'New description',
        start_year: validDates.start_year,
        end_year: validDates.end_year,
        updated_by: 2,
      });
    });
  });

  describe('remove', () => {
    it('should soft-delete a portfolio by setting is_active to false', async () => {
      mockUpdate.mockResolvedValue({ affected: 1 });

      const result = await service.remove(3);

      expect(mockUpdate).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          is_active: false,
          deleted_at: expect.any(Date),
        }),
      );
      expect(result).toBe(3);
    });

    it('should throw BadRequestException when portfolio is not found', async () => {
      mockUpdate.mockResolvedValue({ affected: 0 });

      await expect(service.remove(3)).rejects.toThrow('Portfolio not found');
    });
  });

  describe('findByYear', () => {
    // A genuine predicate evaluator over the fixture list — not a canned
    // return value — so the is_active and shifted-range cases can actually
    // fail against an implementation that never applies the where clause
    // (KZ-001).
    const evaluateWhere = (
      portfolio: Portfolio,
      where: Record<string, any>,
    ): boolean =>
      Object.entries(where).every(([key, condition]) => {
        const actual = (portfolio as any)[key];
        if (condition && typeof condition === 'object' && 'type' in condition) {
          if (condition.type === 'lessThanOrEqual') {
            return actual <= condition.value;
          }
          if (condition.type === 'moreThanOrEqual') {
            return actual >= condition.value;
          }
          throw new Error(
            `Unsupported FindOperator type in test double: ${condition.type}`,
          );
        }
        return actual === condition;
      });

    const buildPortfolio = (overrides: Partial<Portfolio>): Portfolio =>
      ({
        id: 1,
        name: 'Portfolio',
        description: '',
        start_year: 2010,
        end_year: 2025,
        is_active: true,
        ...overrides,
      }) as Portfolio;

    const fakeFindOne = (fixtures: Portfolio[]) =>
      jest.fn(async ({ where, order }: any) => {
        const matches = fixtures.filter((portfolio) =>
          evaluateWhere(portfolio, where),
        );
        if (order?.id === 'ASC') {
          matches.sort((a, b) => a.id - b.id);
        }
        return matches[0] ?? null;
      });

    it('resolves 2025 to the portfolio covering 2025, and 2026 to the portfolio covering 2026', async () => {
      const p1 = buildPortfolio({ id: 1, start_year: 2010, end_year: 2025 });
      const p2 = buildPortfolio({ id: 2, start_year: 2026, end_year: 2030 });
      mockFindOne.mockImplementation(fakeFindOne([p1, p2]));

      await expect(service.findByYear(2025)).resolves.toBe(p1);
      await expect(service.findByYear(2026)).resolves.toBe(p2);
    });

    it('does not return a portfolio with is_active = false even when its range matches', async () => {
      const inactive = buildPortfolio({
        id: 1,
        start_year: 2010,
        end_year: 2025,
        is_active: false,
      });
      mockFindOne.mockImplementation(fakeFindOne([inactive]));

      await expect(service.findByYear(2025)).resolves.toBeNull();
    });

    it('routes 2026 to portfolio 1 once the fixture ranges are shifted in data, with no code change', async () => {
      const p1 = buildPortfolio({ id: 1, start_year: 2010, end_year: 2026 });
      const p2 = buildPortfolio({ id: 2, start_year: 2027, end_year: 2030 });
      mockFindOne.mockImplementation(fakeFindOne([p1, p2]));

      await expect(service.findByYear(2026)).resolves.toBe(p1);
    });

    it('returns null without throwing for a year outside every portfolio range', async () => {
      const p1 = buildPortfolio({ id: 1, start_year: 2010, end_year: 2025 });
      const p2 = buildPortfolio({ id: 2, start_year: 2026, end_year: 2030 });
      mockFindOne.mockImplementation(fakeFindOne([p1, p2]));

      await expect(service.findByYear(1999)).resolves.toBeNull();
    });

    it('memoizes by year: a 10-call sequence over 2 distinct years issues 2 repository calls', async () => {
      const p1 = buildPortfolio({ id: 1, start_year: 2010, end_year: 2025 });
      const p2 = buildPortfolio({ id: 2, start_year: 2026, end_year: 2030 });
      mockFindOne.mockImplementation(fakeFindOne([p1, p2]));

      const years = [
        2025, 2026, 2025, 2026, 2025, 2026, 2025, 2026, 2025, 2026,
      ];
      for (const year of years) {
        await service.findByYear(year);
      }

      expect(mockFindOne).toHaveBeenCalledTimes(2);
    });

    it('memoizes negative results too, so repeated unresolvable years issue one repository call', async () => {
      const p1 = buildPortfolio({ id: 1, start_year: 2010, end_year: 2025 });
      mockFindOne.mockImplementation(fakeFindOne([p1]));

      await service.findByYear(1999);
      await service.findByYear(1999);
      await service.findByYear(1999);

      expect(mockFindOne).toHaveBeenCalledTimes(1);
    });
  });
});
