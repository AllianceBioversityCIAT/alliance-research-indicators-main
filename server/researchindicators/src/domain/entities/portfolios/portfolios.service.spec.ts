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
    clarisa_levers: [],
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

      expect(mockUpdate).toHaveBeenCalledWith(3, { is_active: false });
      expect(result).toBe(3);
    });

    it('should throw BadRequestException when portfolio is not found', async () => {
      mockUpdate.mockResolvedValue({ affected: 0 });

      await expect(service.remove(3)).rejects.toThrow('Portfolio not found');
    });
  });
});
