import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AllianceUserStaffService } from './alliance-user-staff.service';
import { AllianceUserStaff } from './entities/alliance-user-staff.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { PaginationDto } from '../../shared/global-dto/pagination.dto';

describe('AllianceUserStaffService', () => {
  let service: AllianceUserStaffService;

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    metadata: {
      primaryColumns: [{ propertyName: 'id' }],
    },
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
  };

  const mockCurrentUser = {
    user: { id: 1 },
    audit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    queryBuilder.where.mockReturnThis();
    queryBuilder.andWhere.mockReturnThis();
    queryBuilder.take.mockReturnThis();
    queryBuilder.skip.mockReturnThis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllianceUserStaffService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<AllianceUserStaffService>(AllianceUserStaffService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findUserByFirstAndLastName', () => {
    it('should query by first and last name', async () => {
      const user = { id: 1 } as unknown as AllianceUserStaff;
      queryBuilder.getOne.mockResolvedValue(user);

      const result = await service.findUserByFirstAndLastName('Ada', 'Lovelace');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'user.first_name = :first_name',
        { first_name: 'Ada' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.last_name = :last_name',
        { last_name: 'Lovelace' },
      );
      expect(queryBuilder.getOne).toHaveBeenCalled();
      expect(result).toBe(user);
    });
  });

  describe('findBySearch', () => {
    it('should apply active filter only when search is empty', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      await service.findBySearch('');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.is_active = :isActive',
        { isActive: true },
      );
      expect(queryBuilder.getMany).toHaveBeenCalled();
      expect(
        queryBuilder.andWhere.mock.calls.some(
          (c) =>
            typeof c[0] === 'string' && c[0].includes('LIKE :search'),
        ),
      ).toBe(false);
    });

    it('should add search clause when search is provided', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      await service.findBySearch('ann');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.first_name LIKE :search OR user.last_name LIKE :search or user.email LIKE :search',
        { search: '%ann%' },
      );
    });
  });

  describe('findWithFilters', () => {
    it('should paginate when page and limit are valid', async () => {
      const rows = [{ id: 1 } as unknown as AllianceUserStaff];
      queryBuilder.getMany.mockResolvedValue(rows);
      const pagination = { page: 2, limit: 5 } as PaginationDto;

      const result = await service.findWithFilters(pagination);

      expect(queryBuilder.take).toHaveBeenCalledWith(5);
      expect(queryBuilder.skip).toHaveBeenCalledWith(5);
      expect(result).toBe(rows);
    });

    it('should filter by name when provided', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      await service.findWithFilters({} as PaginationDto, 'marie');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.first_name LIKE :name OR user.last_name LIKE :name)',
        { name: '%marie%' },
      );
    });
  });
});
