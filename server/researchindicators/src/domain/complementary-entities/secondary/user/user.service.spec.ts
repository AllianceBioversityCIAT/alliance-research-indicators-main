import { Test, TestingModule } from '@nestjs/testing';
import { AlianceManagementApp } from '../../../tools/broker/aliance-management.app';
import { UserService } from './user.service';
import { User } from './user.entity';

describe('UserService', () => {
  let service: UserService;
  const sendToPattern = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: AlianceManagementApp,
          useValue: { sendToPattern },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('find', () => {
    it('should delegate to aliance management pattern', async () => {
      const users: User[] = [{ sec_user_id: 1 } as User];
      sendToPattern.mockResolvedValue(users);

      const result = await service.find([1, 2]);

      expect(sendToPattern).toHaveBeenCalledWith('user/find-by-id', [1, 2]);
      expect(result).toBe(users);
    });
  });

  describe('existUsers', () => {
    it('should return ids that are not returned by find', async () => {
      sendToPattern.mockResolvedValue([{ sec_user_id: 1 } as User]);

      const result = await service.existUsers([1, 2, 3]);

      expect(result).toEqual([2, 3]);
    });

    it('should return all ids when find returns empty', async () => {
      sendToPattern.mockResolvedValue([]);

      const result = await service.existUsers([10, 20]);

      expect(result).toEqual([10, 20]);
    });
  });
});
