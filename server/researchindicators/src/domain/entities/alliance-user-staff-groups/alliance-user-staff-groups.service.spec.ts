import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AllianceUserStaffGroupsService } from './alliance-user-staff-groups.service';
import { AllianceUserStaffGroup } from './entities/alliance-user-staff-group.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { AllianceUserStaff } from '../alliance-user-staff/entities/alliance-user-staff.entity';

describe('AllianceUserStaffGroupsService', () => {
  let service: AllianceUserStaffGroupsService;
  const find = jest.fn();

  const mockRepository = {
    find,
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
    find.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllianceUserStaffGroupsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<AllianceUserStaffGroupsService>(
      AllianceUserStaffGroupsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllMap', () => {
    it('should return alliance user staff for active groups without group filter', async () => {
      const staff = { sec_user_id: 1 } as unknown as AllianceUserStaff;
      find.mockResolvedValue([{ allianceUserStaff: staff }]);

      const result = await service.findAllMap();

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(
        AllianceUserStaffGroup,
      );
      expect(find).toHaveBeenCalledWith({
        where: { is_active: true },
        relations: { allianceUserStaff: true },
      });
      expect(result).toEqual([staff]);
    });

    it('should filter by staff_group_id when groupId is provided', async () => {
      find.mockResolvedValue([]);

      await service.findAllMap(42);

      expect(find).toHaveBeenCalledWith({
        where: { is_active: true, staff_group_id: 42 },
        relations: { allianceUserStaff: true },
      });
    });
  });
});
