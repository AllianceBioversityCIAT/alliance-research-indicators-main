import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ImpactOutcomesService } from './impact-outcomes.service';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { ImpactOutcomesRepository } from './repositories/impact-outcomes.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { CreateImpactOutcomeDto } from './dto/create-impact-outcome.dto';
import { UpdateImpactOutcomeDto } from './dto/update-impact-outcome.dto';

describe('ImpactOutcomesService', () => {
  let service: ImpactOutcomesService;

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

  const mockPortfoliosService = {
    validatePortfolio: jest.fn(),
  };

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ created_by: 1, updated_by: 1 }),
  };

  const baseCreateDto: CreateImpactOutcomeDto = {
    name: 'Outcome A',
    description: 'Description',
    portfolio_id: 1,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCurrentUser.audit.mockReturnValue({ created_by: 1, updated_by: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpactOutcomesService,
        { provide: PortfoliosService, useValue: mockPortfoliosService },
        { provide: ImpactOutcomesRepository, useValue: mockRepository },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<ImpactOutcomesService>(ImpactOutcomesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should save an impact outcome when portfolio exists', async () => {
      const portfolio = { id: 1, name: 'Portfolio A' };
      const saved = { id: 10, ...baseCreateDto };
      mockPortfoliosService.validatePortfolio.mockResolvedValue(portfolio);
      mockSave.mockResolvedValue(saved);

      const result = await service.create(baseCreateDto);

      expect(mockPortfoliosService.validatePortfolio).toHaveBeenCalledWith(1);
      expect(mockSave).toHaveBeenCalledWith({
        name: 'Outcome A',
        description: 'Description',
        portfolio_id: 1,
        created_by: 1,
        updated_by: 1,
      });
      expect(result).toBe(saved);
    });

    it('should propagate BadRequestException when portfolio is not found', async () => {
      mockPortfoliosService.validatePortfolio.mockRejectedValue(
        new BadRequestException('Portfolio not found'),
      );

      await expect(service.create(baseCreateDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return active impact outcomes ordered by name', async () => {
      const outcomes = [{ id: 1, name: 'A', is_active: true }];
      mockFind.mockResolvedValue(outcomes);

      const result = await service.findAll();

      expect(mockFind).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { name: 'ASC' },
      });
      expect(result).toBe(outcomes);
    });

    it('should filter by portfolio id when provided', async () => {
      const outcomes = [{ id: 2, name: 'B', portfolio_id: 3 }];
      mockFind.mockResolvedValue(outcomes);

      const result = await service.findAll(3);

      expect(mockFind).toHaveBeenCalledWith({
        where: { is_active: true, portfolio_id: 3 },
        order: { name: 'ASC' },
      });
      expect(result).toBe(outcomes);
    });
  });

  describe('findOne', () => {
    it('should return an active impact outcome by id', async () => {
      const outcome = { id: 5, name: 'Outcome', is_active: true };
      mockFindOne.mockResolvedValue(outcome);

      const result = await service.findOne(5);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { id: 5, is_active: true },
        order: { name: 'ASC' },
      });
      expect(result).toBe(outcome);
    });

    it('should return null when id is missing', async () => {
      const result = await service.findOne(0);

      expect(result).toBeNull();
      expect(mockFindOne).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateImpactOutcomeDto = {
      name: 'Updated',
      description: 'New description',
      portfolio_id: 2,
    };

    it('should update an impact outcome when portfolio exists', async () => {
      const updated = { id: 1, ...updateDto };
      mockPortfoliosService.validatePortfolio.mockResolvedValue({ id: 2 });
      mockUpdate.mockResolvedValue({ affected: 1 });
      mockFindOne.mockResolvedValue(updated);
      mockCurrentUser.audit.mockReturnValue({ updated_by: 2 });

      const result = await service.update(1, updateDto);

      expect(mockPortfoliosService.validatePortfolio).toHaveBeenCalledWith(2);
      expect(mockUpdate).toHaveBeenCalledWith(1, {
        name: 'Updated',
        description: 'New description',
        portfolio_id: 2,
        updated_by: 2,
      });
      expect(mockFindOne).toHaveBeenCalledWith({
        where: { id: 1, is_active: true },
        order: { name: 'ASC' },
      });
      expect(result).toBe(updated);
    });

    it('should propagate BadRequestException when portfolio is not found', async () => {
      mockPortfoliosService.validatePortfolio.mockRejectedValue(
        new BadRequestException('Portfolio not found'),
      );

      await expect(service.update(1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft-delete an impact outcome and return the id', async () => {
      mockUpdate.mockResolvedValue({ affected: 1 });
      mockCurrentUser.audit.mockReturnValue({ updated_by: 2 });

      const result = await service.remove(3);

      expect(mockUpdate).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          is_active: false,
          deleted_at: expect.any(Date),
          updated_by: 2,
        }),
      );
      expect(result).toBe(3);
    });

    it('should throw BadRequestException when update affects no rows', async () => {
      mockUpdate.mockResolvedValue({ affected: 0 });

      await expect(service.remove(3)).rejects.toThrow(BadRequestException);
      await expect(service.remove(3)).rejects.toThrow(
        'Impact outcome not found',
      );
    });
  });
});
