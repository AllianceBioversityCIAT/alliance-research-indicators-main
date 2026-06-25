import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StrategicObjectivesService } from './strategic-objectives.service';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { StrategicObjectivesRepository } from './repositories/strategic-objectives.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { CreateStrategicObjectiveDto } from './dto/create-strategic-objective.dto';
import { UpdateStrategicObjectiveDto } from './dto/update-strategic-objective.dto';

describe('StrategicObjectivesService', () => {
  let service: StrategicObjectivesService;

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
    findOne: jest.fn(),
  };

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ created_by: 1 }),
  };

  const baseCreateDto: CreateStrategicObjectiveDto = {
    name: 'Objective A',
    description: 'Description',
    portfolio_id: 1,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCurrentUser.audit.mockReturnValue({ created_by: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrategicObjectivesService,
        { provide: PortfoliosService, useValue: mockPortfoliosService },
        { provide: StrategicObjectivesRepository, useValue: mockRepository },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<StrategicObjectivesService>(
      StrategicObjectivesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should save a strategic objective when portfolio exists', async () => {
      const portfolio = { id: 1, name: 'Portfolio A' };
      const saved = { id: 10, ...baseCreateDto };
      mockPortfoliosService.findOne.mockResolvedValue(portfolio);
      mockSave.mockResolvedValue(saved);

      const result = await service.create(baseCreateDto);

      expect(mockPortfoliosService.findOne).toHaveBeenCalledWith(1);
      expect(mockSave).toHaveBeenCalledWith({
        name: 'Objective A',
        description: 'Description',
        portfolio_id: 1,
        created_by: 1,
      });
      expect(result).toBe(saved);
    });

    it('should throw BadRequestException when portfolio is not found', async () => {
      mockPortfoliosService.findOne.mockResolvedValue(null);

      await expect(service.create(baseCreateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(baseCreateDto)).rejects.toThrow(
        'Portfolio not found',
      );
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return active strategic objectives ordered by name', async () => {
      const objectives = [{ id: 1, name: 'A', is_active: true }];
      mockFind.mockResolvedValue(objectives);

      const result = await service.findAll();

      expect(mockFind).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { name: 'ASC' },
      });
      expect(result).toBe(objectives);
    });

    it('should filter by portfolio id when provided', async () => {
      const objectives = [{ id: 2, name: 'B', portfolio_id: 3 }];
      mockFind.mockResolvedValue(objectives);

      const result = await service.findAll(3);

      expect(mockFind).toHaveBeenCalledWith({
        where: { is_active: true, portfolio_id: 3 },
        order: { name: 'ASC' },
      });
      expect(result).toBe(objectives);
    });
  });

  describe('findOne', () => {
    it('should return an active strategic objective by id', async () => {
      const objective = { id: 5, name: 'Objective', is_active: true };
      mockFindOne.mockResolvedValue(objective);

      const result = await service.findOne(5);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { id: 5, is_active: true },
      });
      expect(result).toBe(objective);
    });

    it('should throw BadRequestException when id is missing', async () => {
      await expect(service.findOne(0)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0)).rejects.toThrow('Id is required');
      expect(mockFindOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when strategic objective is not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(99)).rejects.toThrow(
        'Strategic objective not found',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateStrategicObjectiveDto = {
      name: 'Updated',
      portfolio_id: 2,
    };

    it('should update a strategic objective when portfolio and record exist', async () => {
      const existing = { id: 1, name: 'Old', portfolio_id: 1 };
      mockPortfoliosService.findOne.mockResolvedValue({ id: 2 });
      mockFindOne.mockResolvedValue(existing);
      mockUpdate.mockResolvedValue({ affected: 1 });

      const result = await service.update(1, updateDto);

      expect(mockPortfoliosService.findOne).toHaveBeenCalledWith(2);
      expect(mockUpdate).toHaveBeenCalledWith(1, updateDto);
      expect(result).toEqual({ ...existing, ...updateDto });
    });

    it('should throw BadRequestException when portfolio is not found', async () => {
      mockPortfoliosService.findOne.mockResolvedValue(null);

      await expect(service.update(1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateDto)).rejects.toThrow(
        'Portfolio by id 2 not found',
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when strategic objective is not found', async () => {
      mockPortfoliosService.findOne.mockResolvedValue({ id: 2 });
      mockFindOne.mockResolvedValue(null);

      await expect(service.update(1, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft-delete a strategic objective and return the id', async () => {
      mockFindOne.mockResolvedValue({
        id: 3,
        name: 'To remove',
        is_active: true,
      });
      mockUpdate.mockResolvedValue({ affected: 1 });

      const result = await service.remove(3);

      expect(mockUpdate).toHaveBeenCalledWith(3, { is_active: false });
      expect(result).toBe(3);
    });

    it('should throw NotFoundException when strategic objective is not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(service.remove(3)).rejects.toThrow(NotFoundException);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when update affects no rows', async () => {
      mockFindOne.mockResolvedValue({
        id: 3,
        name: 'To remove',
        is_active: true,
      });
      mockUpdate.mockResolvedValue({ affected: 0 });

      await expect(service.remove(3)).rejects.toThrow(BadRequestException);
      await expect(service.remove(3)).rejects.toThrow(
        'Strategic objective not found',
      );
    });
  });
});
