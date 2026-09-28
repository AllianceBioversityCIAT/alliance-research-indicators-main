import { HttpModule } from '@nestjs/axios';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { AppSecretHostList } from '../../../entities/app-secret-host-list/entities/app-secret-host-list.entity';
import { AppSecret } from '../../../entities/app-secrets/entities/app-secret.entity';
import { AgressoStaffModule } from './agresso-staff-tools.module';
import { EXTERNAL_STATUS_ID } from './dto/deactivation-config.dto';
import { SecUserDeactivationRepository } from './sec-user-deactivation.repository';
import { CHUNK } from './sec-user-reconciler.repository';

interface CapturedSql {
  sql: string;
  params: unknown[];
}

class MetadataDataSource extends DataSource {
  async prepare(): Promise<void> {
    await this.buildMetadatas();
  }
}

/** One inactive id in each CHUNK of a 1..120 id list, so a dropped predicate inflates every chunk. */
const INACTIVE_ROW_IDS = [7, 60, 110];
const INACTIVE_ROW_ID_SET = new Set(INACTIVE_ROW_IDS);
const ACTIVE_ROW_COUNT = 120 - INACTIVE_ROW_IDS.length;

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
    // REGRESSION — the live Dev defect (2026-09-25). The external row is named
    // `External Accepted`, not `External`, so the previous name lookup matched nothing and every
    // run aborted on C-4 before the measurement could be taken. Selection is by id: the name is
    // free to be anything.
    it('resolves the external row by id even though its name is not the bare word External', async () => {
      querySpy.mockResolvedValueOnce([
        { user_status_id: 1, name: 'Accepted' },
        { user_status_id: 2, name: 'Pending' },
        { user_status_id: 3, name: 'Rejected' },
        { user_status_id: 4, name: 'External Accepted' },
      ]);

      await expect(repository.resolveExternalStatusId(4)).resolves.toEqual({
        statusId: 4,
        matchCount: 1,
      });
    });

    it('returns a null id and matchCount 0 when no active row carries the external id', async () => {
      querySpy.mockResolvedValueOnce([
        { user_status_id: 1, name: 'Accepted' },
        { user_status_id: 2, name: 'Pending' },
      ]);

      await expect(repository.resolveExternalStatusId(4)).resolves.toEqual({
        statusId: null,
        matchCount: 0,
      });
    });

    // A name alone must NOT resolve: an environment that renamed some other row to `External`
    // would otherwise shield the wrong cohort silently.
    it('does not resolve a row merely because its name reads External', async () => {
      querySpy.mockResolvedValueOnce([
        { user_status_id: 9, name: 'External' },
        { user_status_id: 1, name: 'Accepted' },
      ]);

      await expect(repository.resolveExternalStatusId(4)).resolves.toEqual({
        statusId: null,
        matchCount: 0,
      });
    });

    // The configured id is the selector. A fixture that asks for 4 cannot tell a
    // parameter from the seed constant — 9 is not that constant.
    it('selects the supplied ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID when it is not 4', async () => {
      const configuredId = 9;
      expect(configuredId).not.toBe(EXTERNAL_STATUS_ID);

      querySpy.mockResolvedValueOnce([
        { user_status_id: 4, name: 'External Accepted' },
        { user_status_id: configuredId, name: 'Partner' },
      ]);

      await expect(
        repository.resolveExternalStatusId(configuredId),
      ).resolves.toEqual({
        statusId: configuredId,
        matchCount: 1,
      });
    });

    it('returns exactly one matching id after Number coercion', async () => {
      querySpy.mockResolvedValueOnce([
        { user_status_id: '4', name: 'External Accepted' },
      ]);

      const result = await repository.resolveExternalStatusId(4);

      expect(result).toEqual({ statusId: 4, matchCount: 1 });
      expect(typeof result.statusId).toBe('number');
    });

    it('emits both active and non-deleted predicates in the status SQL', async () => {
      await repository.resolveExternalStatusId(4);

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

  it('opens no transaction and does not write alliance_user_staff', () => {
    const source = readFileSync(
      join(__dirname, 'sec-user-deactivation.repository.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/\.transaction\s*\(/);
    expect(source).not.toMatch(/\b(?:INSERT|DELETE)\b/i);
    expect(source).not.toMatch(/alliance_user_staff/);
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

  describe('deactivation writes', () => {
    let dataSource: MetadataDataSource;

    beforeAll(async () => {
      dataSource = new MetadataDataSource({
        type: 'mysql',
        database: 'unused',
        entities: [AppSecret, AppSecretHostList],
      });
      await dataSource.prepare();
    });

    function captureRaw(): { manager: EntityManager; calls: CapturedSql[] } {
      const calls: CapturedSql[] = [];
      const manager = {
        query: jest.fn(async (sql: string, params: unknown[] = []) => {
          calls.push({ sql, params });
          return { affectedRows: affectedRowsForRawSql(sql, params) };
        }),
      };
      return { manager: manager as unknown as EntityManager, calls };
    }

    function captureAppSecrets(): {
      manager: EntityManager;
      calls: CapturedSql[];
      getRepository: jest.SpyInstance;
    } {
      const queryRunner = dataSource.createQueryRunner();
      const calls: CapturedSql[] = [];
      queryRunner.query = (async (sql: string, params: unknown[] = []) => {
        calls.push({ sql, params });
        return {
          affected: affectedRowsForAppSecretsSql(sql, params),
          records: [],
        };
      }) as QueryRunner['query'];
      const getRepository = jest.spyOn(queryRunner.manager, 'getRepository');
      return { manager: queryRunner.manager, calls, getRepository };
    }

    it('writes app_secrets through manager.getRepository(AppSecret)', async () => {
      const captured = captureAppSecrets();

      const count = await repository.deactivateAppSecrets(
        captured.manager,
        [4, 2],
      );

      expect(captured.getRepository).toHaveBeenCalledWith(AppSecret);
      expect(querySpy).not.toHaveBeenCalled();
      expect(captured.calls).toHaveLength(1);
      expect(captured.calls[0].sql).toMatch(/UPDATE `app_secrets`/);
      expect(captured.calls[0].sql).toMatch(
        /responsible_user_id` IN \(\?, \?\)/,
      );
      expect(captured.calls[0].params.slice(1, -1)).toEqual([2, 4]);
      expect(count).toBe(2);
    });

    it('writes sec_user_roles for each supplied user_id', async () => {
      const captured = captureRaw();

      const count = await repository.deactivateSecUserRoles(
        captured.manager,
        [4, 2],
      );

      expect(querySpy).not.toHaveBeenCalled();
      expect(captured.calls).toHaveLength(1);
      expect(captured.calls[0].sql).toMatch(
        /UPDATE sec_user_roles SET is_active = 0/,
      );
      expect(captured.calls[0].sql).toMatch(/WHERE user_id IN \(\?, \?\)/);
      expect(captured.calls[0].sql).not.toMatch(/sec_user_role_id/);
      expect(captured.calls[0].params).toEqual([2, 4]);
      expect(count).toBe(2);
    });

    it('writes sec_users for each supplied sec_user_id', async () => {
      const captured = captureRaw();

      const count = await repository.deactivateSecUsers(
        captured.manager,
        [4, 2],
      );

      expect(querySpy).not.toHaveBeenCalled();
      expect(captured.calls).toHaveLength(1);
      expect(captured.calls[0].sql).toMatch(
        /UPDATE sec_users SET is_active = 0/,
      );
      expect(captured.calls[0].sql).toMatch(/WHERE sec_user_id IN \(\?, \?\)/);
      expect(captured.calls[0].params).toEqual([2, 4]);
      expect(count).toBe(2);
    });

    it('chunks 120 ids into three sorted CHUNK-sized statements on every table', async () => {
      const ids = [
        ...Array.from({ length: 120 }, (_, index) => 120 - index),
        1,
        2,
        3,
      ];
      const expectedChunks = [range(1, 50), range(51, 100), range(101, 120)];

      const secrets = captureAppSecrets();
      const roles = captureRaw();
      const users = captureRaw();

      await repository.deactivateAppSecrets(secrets.manager, ids);
      await repository.deactivateSecUserRoles(roles.manager, ids);
      await repository.deactivateSecUsers(users.manager, ids);

      expect(CHUNK).toBe(50);
      expect(Math.ceil(120 / CHUNK)).toBe(3);
      expect(secrets.calls).toHaveLength(3);
      expect(roles.calls).toHaveLength(3);
      expect(users.calls).toHaveLength(3);
      expect(secrets.calls.map((call) => call.params.slice(1, -1))).toEqual(
        expectedChunks,
      );
      expect(roles.calls.map((call) => call.params)).toEqual(expectedChunks);
      expect(users.calls.map((call) => call.params)).toEqual(expectedChunks);
      expectedChunks.forEach((chunk) => {
        expect(chunk).toEqual([...chunk].sort((left, right) => left - right));
      });
      expect(expectedChunks[0]).toHaveLength(CHUNK);
      expect(expectedChunks[1]).toHaveLength(CHUNK);
      expect(expectedChunks[2]).toHaveLength(20);
    });

    it('does not rewrite an already-inactive row and does not inflate the count', async () => {
      const ids = Array.from({ length: 120 }, (_, index) => index + 1);
      const secrets = captureAppSecrets();
      const roles = captureRaw();
      const users = captureRaw();

      const secretsCount = await repository.deactivateAppSecrets(
        secrets.manager,
        ids,
      );
      const rolesCount = await repository.deactivateSecUserRoles(
        roles.manager,
        ids,
      );
      const usersCount = await repository.deactivateSecUsers(
        users.manager,
        ids,
      );

      expect([
        statementOutcome('app_secrets', secrets.calls, secretsCount),
        statementOutcome('sec_user_roles', roles.calls, rolesCount),
        statementOutcome('sec_users', users.calls, usersCount),
      ]).toEqual([
        {
          table: 'app_secrets',
          count: ACTIVE_ROW_COUNT,
          rewrittenInactive: [],
        },
        {
          table: 'sec_user_roles',
          count: ACTIVE_ROW_COUNT,
          rewrittenInactive: [],
        },
        { table: 'sec_users', count: ACTIVE_ROW_COUNT, rewrittenInactive: [] },
      ]);
    });

    it('leaves updated_by NULL per DD-D12 and does not assert updated_at', async () => {
      const secrets = captureAppSecrets();
      const roles = captureRaw();
      const users = captureRaw();

      await repository.deactivateAppSecrets(secrets.manager, [2, 4]);
      await repository.deactivateSecUserRoles(roles.manager, [2, 4]);
      await repository.deactivateSecUsers(users.manager, [2, 4]);

      const statements = [...secrets.calls, ...roles.calls, ...users.calls].map(
        (call) => call.sql,
      );

      expect(statements).toHaveLength(3);
      for (const sql of statements) {
        expect(sql).not.toMatch(/updated_by/i);
      }
    });

    it('does not write when the id list is empty', async () => {
      const secrets = captureAppSecrets();
      const roles = captureRaw();
      const users = captureRaw();

      await expect(
        repository.deactivateAppSecrets(secrets.manager, []),
      ).resolves.toBe(0);
      await expect(
        repository.deactivateSecUserRoles(roles.manager, []),
      ).resolves.toBe(0);
      await expect(
        repository.deactivateSecUsers(users.manager, []),
      ).resolves.toBe(0);
      expect(secrets.calls).toHaveLength(0);
      expect(roles.calls).toHaveLength(0);
      expect(users.calls).toHaveLength(0);
    });

    it.each([
      [
        'app_secrets',
        (manager: EntityManager) =>
          repository.deactivateAppSecrets(manager, [1, 0]),
      ],
      [
        'sec_user_roles',
        (manager: EntityManager) =>
          repository.deactivateSecUserRoles(manager, [1, 0]),
      ],
      [
        'sec_users',
        (manager: EntityManager) =>
          repository.deactivateSecUsers(manager, [1, 0]),
      ],
    ] as const)(
      'rejects an invalid id before writing %s',
      async (_table, write) => {
        const captured = captureRaw();
        await expect(write(captured.manager)).rejects.toThrow(
          /positive integer user ids/,
        );
        expect(captured.calls).toHaveLength(0);
      },
    );
  });
});

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function affectedRowsForRawSql(sql: string, params: unknown[]): number {
  return idsRewrittenByStatement(sql, params).length;
}

function affectedRowsForAppSecretsSql(sql: string, params: unknown[]): number {
  return idsRewrittenByStatement(sql, params).length;
}

function statementOutcome(
  table: string,
  calls: CapturedSql[],
  count: number,
): { table: string; count: number; rewrittenInactive: number[] } {
  const rewritten = new Set(
    calls.flatMap((call) => idsRewrittenByStatement(call.sql, call.params)),
  );
  return {
    table,
    count,
    rewrittenInactive: INACTIVE_ROW_IDS.filter((id) => rewritten.has(id)),
  };
}

/**
 * Rows the captured statement would change. The active-row exclusion is read
 * off the SQL text: without it, every id in the statement is rewritten.
 */
function idsRewrittenByStatement(sql: string, params: unknown[]): number[] {
  if (/UPDATE `app_secrets`/i.test(sql)) {
    const onlyActive =
      /AND `is_active` = \?/.test(sql) &&
      (params.at(-1) === true || params.at(-1) === 1) &&
      !/\bOR\b/i.test(sql);
    const ids = (onlyActive ? params.slice(1, -1) : params.slice(1)).map(
      Number,
    );
    return onlyActive ? ids.filter((id) => !INACTIVE_ROW_ID_SET.has(id)) : ids;
  }

  if (/UPDATE sec_user_roles /i.test(sql) || /UPDATE sec_users /i.test(sql)) {
    const ids = params.map(Number);
    const onlyActive =
      /\bAND is_active = 1\b/.test(sql) && !/\bOR\b/i.test(sql);
    return onlyActive ? ids.filter((id) => !INACTIVE_ROW_ID_SET.has(id)) : ids;
  }

  return params.map(Number);
}
