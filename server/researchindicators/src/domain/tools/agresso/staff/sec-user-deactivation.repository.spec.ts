import { HttpModule } from '@nestjs/axios';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntityManager } from 'typeorm';
import { AgressoStaffModule } from './agresso-staff-tools.module';
import { SecUserDeactivationRepository } from './sec-user-deactivation.repository';
import { CHUNK } from './sec-user-reconciler.repository';

describe('SecUserDeactivationRepository', () => {
  let repository: SecUserDeactivationRepository;
  let querySpy: jest.SpyInstance;

  beforeEach(() => {
    repository = new SecUserDeactivationRepository({} as EntityManager);
    querySpy = jest.spyOn(repository, 'query').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('resolveExternalStatusId', () => {
    it('returns a null id and matchCount 2 when two active names match External', async () => {
      querySpy.mockResolvedValueOnce([
        { user_status_id: 4, name: 'External' },
        { user_status_id: 9, name: 'external' },
      ]);

      await expect(repository.resolveExternalStatusId()).resolves.toEqual({
        statusId: null,
        matchCount: 2,
      });
    });

    it('returns a null id and matchCount 0 when no name matches External', async () => {
      querySpy.mockResolvedValueOnce([{ user_status_id: 1, name: 'Internal' }]);

      await expect(repository.resolveExternalStatusId()).resolves.toEqual({
        statusId: null,
        matchCount: 0,
      });
    });

    it('returns exactly one matching id after Number coercion', async () => {
      querySpy.mockResolvedValueOnce([
        { user_status_id: '42', name: 'External' },
      ]);

      const result = await repository.resolveExternalStatusId();

      expect(result).toEqual({ statusId: 42, matchCount: 1 });
      expect(typeof result.statusId).toBe('number');
    });

    it('matches External case- and whitespace-insensitively', async () => {
      querySpy.mockResolvedValueOnce([
        { user_status_id: 7, name: '  EXTERNAL ' },
      ]);

      await expect(repository.resolveExternalStatusId()).resolves.toEqual({
        statusId: 7,
        matchCount: 1,
      });
    });

    it('emits both active and non-deleted predicates in the status SQL', async () => {
      await repository.resolveExternalStatusId();

      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toMatch(/from\s+user_status/i);
      expect(sql).toMatch(/where\s+is_active\s*=\s*1/i);
      expect(sql).toMatch(/and\s+deleted_at\s+is\s+null/i);
      expect(params).toEqual([]);
    });
  });

  describe('countActivePopulation', () => {
    it('counts active sec_users and Number-coerces the raw aggregate', async () => {
      querySpy.mockResolvedValueOnce([{ active_population: '123' }]);

      const result = await repository.countActivePopulation();

      expect(result).toBe(123);
      expect(typeof result).toBe('number');
      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toMatch(/select\s+count\(\*\)/i);
      expect(sql).toMatch(/from\s+sec_users/i);
      expect(sql).toMatch(/where\s+is_active\s*=\s*1/i);
      expect(params).toEqual([]);
    });
  });

  describe('findActiveSystemAdminUserIds', () => {
    it('chunks 120 candidate ids into exactly three CHUNK-sized queries', async () => {
      const ids = Array.from({ length: 120 }, (_, index) => index + 1);

      await repository.findActiveSystemAdminUserIds(ids);

      expect(CHUNK).toBe(50);
      expect(querySpy).toHaveBeenCalledTimes(3);
      expect(querySpy.mock.calls.map(([, params]) => params)).toEqual([
        ids.slice(0, 50),
        ids.slice(50, 100),
        ids.slice(100),
      ]);
    });

    it('returns [] without querying for an empty candidate list', async () => {
      await expect(
        repository.findActiveSystemAdminUserIds([]),
      ).resolves.toEqual([]);
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('coerces raw role ids and tinyint is_active before strict branching', async () => {
      querySpy.mockResolvedValueOnce([
        { user_id: '10', role_id: '1', is_active: 1 },
        { user_id: '20', role_id: '1', is_active: 0 },
      ]);

      const result = await repository.findActiveSystemAdminUserIds([10, 20]);

      expect(result).toEqual([10]);
      expect(typeof result[0]).toBe('number');
    });

    it('parameterises ids and pins active SYSTEM_ADMIN predicates in SQL', async () => {
      await repository.findActiveSystemAdminUserIds([10, 20, 30]);

      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toMatch(/user_id\s+IN\s*\(\?, \?, \?\)/i);
      expect(sql).toMatch(/role_id\s*=\s*1/i);
      expect(sql).toMatch(/is_active\s*=\s*1/i);
      expect(params).toEqual([10, 20, 30]);
    });

    it.each([[2.5], [0], [-1], ['1 OR 1=1' as unknown as number]])(
      'rejects invalid candidate id %p before querying',
      async (invalidId) => {
        await expect(
          repository.findActiveSystemAdminUserIds([1, invalidId]),
        ).rejects.toThrow();
        expect(querySpy).not.toHaveBeenCalled();
      },
    );
  });

  it('contains only read statements and opens no transaction', () => {
    const source = readFileSync(
      join(__dirname, 'sec-user-deactivation.repository.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/\b(?:UPDATE|INSERT|DELETE)\b/i);
    expect(source).not.toMatch(/\.transaction\s*\(/);
  });

  it('takes only EntityManager and is registered as a singleton provider without a new module import', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AgressoStaffModule,
    );
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AgressoStaffModule,
    );

    expect(SecUserDeactivationRepository.length).toBe(1);
    expect(providers).toContain(SecUserDeactivationRepository);
    expect(imports).toEqual([HttpModule]);
  });
});
