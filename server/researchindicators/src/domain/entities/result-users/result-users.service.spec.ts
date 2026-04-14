import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultUsersService } from './result-users.service';
import { UserService } from '../../complementary-entities/secondary/user/user.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { InformativeRolesEnum } from '../informative-roles/enum/informative-roles.enum';
import { ResultUser } from './entities/result-user.entity';

describe('ResultUsersService', () => {
  let service: ResultUsersService;
  const mockFind = jest.fn();
  const mockFindOne = jest.fn();
  const mockUpdate = jest.fn();
  const mockCreate = jest.fn();
  const mockSave = jest.fn();
  const mockTransaction = jest.fn();

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ updated_by: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultUsersService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: mockFind,
              findOne: mockFindOne,
              update: mockUpdate,
              create: mockCreate,
              save: mockSave,
              metadata: {
                primaryColumns: [{ propertyName: 'result_user_id' }],
              },
            }),
            transaction: mockTransaction,
          },
        },
        {
          provide: UserService,
          useValue: {},
        },
        {
          provide: CurrentUserUtil,
          useValue: mockCurrentUser,
        },
      ],
    }).compile();

    service = module.get<ResultUsersService>(ResultUsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 131
  describe('findAuthorContactUserByResultId', () => {
    it('should find active AUTHORS_CONTACT users with relations', async () => {
      const mockUsers = [{ result_user_id: 1, user_id: 'U1' }];
      mockFind.mockResolvedValue(mockUsers);

      const result = await service.findAuthorContactUserByResultId(10);

      expect(mockFind).toHaveBeenCalledWith({
        where: {
          result_id: 10,
          user_role_id: UserRolesEnum.AUTHORS_CONTACT,
          is_active: true,
        },
        relations: { user: true, informativeRole: true },
      });
      expect(result).toEqual(mockUsers);
    });
  });

  // [CLAUDE/DONE] 132
  describe('deleteAuthorContactByResultIdAndKey', () => {
    it('should soft-delete the author/contact user by setting is_active=false', async () => {
      mockUpdate.mockResolvedValue({ affected: 1 });

      await service.deleteAuthorContactByResultIdAndKey(10, 5);

      expect(mockUpdate).toHaveBeenCalledWith(
        {
          result_user_id: 5,
          result_id: 10,
          user_role_id: UserRolesEnum.AUTHORS_CONTACT,
        },
        expect.objectContaining({ is_active: false }),
      );
    });
  });

  // [CLAUDE/DONE] 133
  describe('saveAuthorContactUserByResultId', () => {
    it('should throw error when an invalid informative_role_id is provided', async () => {
      const mockRepo = {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      mockTransaction.mockImplementation(async (cb) => {
        return cb({ getRepository: jest.fn().mockReturnValue(mockRepo) });
      });

      await expect(
        service.saveAuthorContactUserByResultId(1, {
          user_id: 'U1',
          informative_role_id: 999 as any,
        }),
      ).rejects.toThrow('Invalid informative_role_id provided');
    });

    it('should create a new role when no existing roles are found and role is AUTHOR', async () => {
      const newRole = {
        result_user_id: 1,
        informative_role_id: InformativeRolesEnum.AUTHOR,
      };
      const mockRepo = {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn().mockReturnValue(newRole),
        save: jest.fn().mockResolvedValue(newRole),
      };
      mockTransaction.mockImplementation(async (cb) => {
        return cb({ getRepository: jest.fn().mockReturnValue(mockRepo) });
      });

      const result = await service.saveAuthorContactUserByResultId(1, {
        user_id: 'U1',
        informative_role_id: InformativeRolesEnum.AUTHOR,
      });

      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toEqual(newRole);
    });
  });

  // [CLAUDE/DONE] 134
  describe('filterInstitutionsAi', () => {
    it('should return empty acept and pending when users is empty', () => {
      const result = service.filterInstitutionsAi(
        [],
        UserRolesEnum.MAIN_CONTACT,
      );

      expect(result).toEqual({ acept: [], pending: [] });
    });

    it('should classify users with score >= 70 and code as accepted', () => {
      const users = [
        { code: 'U1', name: 'Alice', similarity_score: '85' },
        { code: 'U2', name: 'Bob', similarity_score: '60' },
      ] as any[];

      const { acept, pending } = service.filterInstitutionsAi(
        users,
        UserRolesEnum.MAIN_CONTACT,
      );

      expect(acept).toHaveLength(1);
      expect(acept[0].user_id).toBe('U1');
      expect(pending).toHaveLength(1);
      expect(pending[0].user_name).toBe('Bob');
    });

    it('should classify users with score < 70 as pending', () => {
      const users = [
        { code: null, name: 'Charlie', similarity_score: '50' },
      ] as any[];

      const { acept, pending } = service.filterInstitutionsAi(
        users,
        UserRolesEnum.MAIN_CONTACT,
      );

      expect(acept).toHaveLength(0);
      expect(pending[0].user_code).toBeNull();
    });

    it('should set user_role_id in pending users', () => {
      const users = [
        { code: null, name: 'X', similarity_score: '30' },
      ] as any[];

      const { pending } = service.filterInstitutionsAi(
        users,
        UserRolesEnum.MAIN_CONTACT,
      );

      expect(pending[0].user_role_id).toBe(UserRolesEnum.MAIN_CONTACT);
    });
  });

  // [CLAUDE/DONE] 135
  describe('insertUserAi', () => {
    it('should return null when users list is empty', async () => {
      const result = await service.insertUserAi(
        1,
        [],
        UserRolesEnum.MAIN_CONTACT,
      );

      expect(result).toBeNull();
    });

    it('should save users with the given resultId and role', async () => {
      const users: any[] = [{ user_code: 'C1', user_name: 'Alice', score: 90 }];
      mockSave.mockResolvedValue(users);

      const result = await service.insertUserAi(
        5,
        users,
        UserRolesEnum.MAIN_CONTACT,
      );

      expect(mockSave).toHaveBeenCalledWith([
        expect.objectContaining({
          result_id: 5,
          user_code: 'C1',
          user_role_id: UserRolesEnum.MAIN_CONTACT,
        }),
      ]);
      expect(result).toEqual(users);
    });
  });

  // [CLAUDE/DONE] 136
  describe('findUsersByRoleResult', () => {
    it('should return active users with user relation for the given role and resultId', async () => {
      const mockUsers: Partial<ResultUser>[] = [
        {
          result_user_id: 1,
          user_role_id: UserRolesEnum.MAIN_CONTACT,
          result_id: 10,
        },
      ];
      mockFind.mockResolvedValue(mockUsers);

      const result = await service.findUsersByRoleResult(
        UserRolesEnum.MAIN_CONTACT,
        10,
      );

      expect(mockFind).toHaveBeenCalledWith({
        where: {
          user_role_id: UserRolesEnum.MAIN_CONTACT,
          result_id: 10,
          is_active: true,
        },
        relations: { user: true },
      });
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users match', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findUsersByRoleResult(
        UserRolesEnum.MAIN_CONTACT,
        99,
      );

      expect(result).toEqual([]);
    });
  });
});
