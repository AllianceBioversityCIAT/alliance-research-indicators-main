jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-fixed-1234'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppSecretsService } from './app-secrets.service';
import { AppConfig } from '../../shared/utils/app-config.util';
import { AppSecretRepository } from './repositories/app-secret.repository';
import { AppSecret } from './entities/app-secret.entity';
import { AppSecretHostList } from '../app-secret-host-list/entities/app-secret-host-list.entity';

describe('AppSecretsService', () => {
  let service: AppSecretsService;
  let typeOrmRepo: { findOne: jest.Mock; target: typeof AppSecret };
  const getUserValidation = jest.fn();
  const transaction = jest.fn();

  const mockAppConfigUtil = { SALT: 4 };

  beforeEach(async () => {
    jest.clearAllMocks();
    getUserValidation.mockReset();
    transaction.mockReset();

    typeOrmRepo = {
      findOne: jest.fn(),
      target: AppSecret,
    };

    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(typeOrmRepo),
      transaction,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppSecretsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: AppConfig, useValue: mockAppConfigUtil },
        {
          provide: AppSecretRepository,
          useValue: { getUserValidation },
        },
      ],
    }).compile();

    service = module.get<AppSecretsService>(AppSecretsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRandomPassword', () => {
    it('should return alphanumeric string within requested length', () => {
      const pwd = service.generateRandomPassword(10);

      expect(pwd.length).toBeLessThanOrEqual(10);
      expect(pwd).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('createCredentials', () => {
    it('should throw when user is not found', async () => {
      getUserValidation.mockResolvedValue(null);

      await expect(
        service.createCredentials({ responsible_id: 1 }),
      ).rejects.toThrow(BadRequestException);

      expect(transaction).not.toHaveBeenCalled();
    });

    it('should persist secret and return plaintext key and uuid', async () => {
      getUserValidation.mockResolvedValue({ sec_user_id: 42 });
      const create = jest.fn((row) => row);
      const save = jest.fn().mockResolvedValue({
        app_secret_id: '9',
        app_secret_uuid: 'uuid-fixed-1234',
      });
      transaction.mockImplementation(async (cb) => {
        const manager = {
          getRepository: jest.fn().mockImplementation((Entity) => {
            if (Entity === AppSecret) {
              return { create, save };
            }
            if (Entity === AppSecretHostList) {
              return { save: jest.fn().mockResolvedValue([]) };
            }
            throw new Error('unexpected entity');
          }),
        };
        return cb(manager);
      });

      const result = await service.createCredentials({
        responsible_id: 7,
        application_description: 'App',
      });

      expect(getUserValidation).toHaveBeenCalledWith(7);
      expect(save).toHaveBeenCalled();
      expect(result.app_secret_uuid).toBe('uuid-fixed-1234');
      expect(result.responsible_user_code).toBe(7);
      expect(result.app_secret_description).toBe('App');
      expect(typeof result.app_secret_key).toBe('string');
      const created = create.mock.calls[0][0];
      expect(bcrypt.compareSync(result.app_secret_key, created.app_secret_key)).toBe(
        true,
      );
    });

    it('should save whitelist hosts when provided', async () => {
      getUserValidation.mockResolvedValue({ sec_user_id: 1 });
      const hostSave = jest.fn().mockResolvedValue([]);
      const secretSave = jest.fn().mockResolvedValue({
        app_secret_id: '1',
        app_secret_uuid: 'uuid-fixed-1234',
      });
      transaction.mockImplementation(async (cb) => {
        const manager = {
          getRepository: jest.fn().mockImplementation((Entity) => {
            if (Entity === AppSecret) {
              return {
                create: jest.fn((x) => x),
                save: secretSave,
              };
            }
            if (Entity === AppSecretHostList) {
              return { save: hostSave };
            }
            throw new Error('unexpected entity');
          }),
        };
        return cb(manager);
      });

      await service.createCredentials({
        responsible_id: 1,
        white_listed_hosts: ['a.com', 'b.com'],
      });

      expect(hostSave).toHaveBeenCalledWith([
        { host: 'a.com', app_secret_id: '1' },
        { host: 'b.com', app_secret_id: '1' },
      ]);
    });
  });

  describe('validation', () => {
    it('should return invalid when secret not found', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);

      const result = await service.validation('cid', 'key', 'https://x');

      expect(result).toEqual({ isValid: false, user: null });
    });

    it('should return invalid when password does not match', async () => {
      const hash = bcrypt.hashSync('right-password', mockAppConfigUtil.SALT);
      typeOrmRepo.findOne.mockResolvedValue({
        app_secret_key: hash,
        app_secret_id: '1',
        app_secret_host_list: [],
        responsible_user_id: 1,
      });

      const result = await service.validation('cid', 'wrong-password', 'o');

      expect(result.isValid).toBe(false);
    });

    it('should return invalid when origin not in whitelist', async () => {
      const hash = bcrypt.hashSync('secret-key', mockAppConfigUtil.SALT);
      typeOrmRepo.findOne.mockResolvedValue({
        app_secret_key: hash,
        app_secret_id: '1',
        app_secret_host_list: [{ host: 'allowed.com' }],
        responsible_user_id: 2,
      });
      getUserValidation.mockResolvedValue({ sec_user_id: 2 });

      const result = await service.validation('cid', 'secret-key', 'other.com');

      expect(result.isValid).toBe(false);
    });

    it('should return valid user when origin matches whitelist', async () => {
      const hash = bcrypt.hashSync('secret-key', mockAppConfigUtil.SALT);
      const user = { sec_user_id: 3 };
      typeOrmRepo.findOne.mockResolvedValue({
        app_secret_key: hash,
        app_secret_id: '1',
        app_secret_host_list: [{ host: 'good.com' }],
        responsible_user_id: 3,
      });
      getUserValidation.mockResolvedValue(user);

      const result = await service.validation('cid', 'secret-key', 'good.com');

      expect(result).toEqual({ isValid: true, user });
    });

    it('should skip host check when whitelist is empty', async () => {
      const hash = bcrypt.hashSync('secret-key', mockAppConfigUtil.SALT);
      const user = { sec_user_id: 4 };
      typeOrmRepo.findOne.mockResolvedValue({
        app_secret_key: hash,
        app_secret_id: '1',
        app_secret_host_list: [],
        responsible_user_id: 4,
      });
      getUserValidation.mockResolvedValue(user);

      const result = await service.validation('cid', 'secret-key', 'any');

      expect(result).toEqual({ isValid: true, user });
    });
  });
});
