import { readFileSync } from 'fs';
import { join } from 'path';
import { QueryRunner } from 'typeorm';
import { RolesFocusEnum } from '../../domain/shared/enum/roles-focus.enum';
import { SecRolesEnum } from '../../domain/shared/enum/sec_role.enum';
import { CreateOdsAdminRole1795000000000 } from '../migrations/1795000000000-createOdsAdminRole';

/**
 * Behavioral spec for `1795000000000-createOdsAdminRole`
 * (docs/specs/institutional-performance/strategy-framework, T-01,
 * R-STF-013 AC.1, design §3.3).
 *
 * UNIT test (`npm test`) — the `QueryRunner` is an in-memory stand-in that
 * answers from the SQL text and the bound parameters. It is not a MySQL
 * connection.
 *
 * CANNOT PROVE (KZ-017): a stand-in that returns rows for
 * `information_schema.KEY_COLUMN_USAGE` does not prove the FK walk. Only a
 * run against the local scratch database counts for `down`. This file also
 * cannot see `@Roles(...)` call sites; `npm run build` covers those.
 */

const MIGRATION_FILE = join(
  __dirname,
  '../migrations/1795000000000-createOdsAdminRole.ts',
);

const OTHER_NAME = 'Hand Made Role';

const BASELINE_FKS = [
  { tableName: 'sec_role_endpoint_permissions', columnName: 'role_id' },
  { tableName: 'sec_role_functional_permissions', columnName: 'role_id' },
  { tableName: 'sec_user_role_contracts', columnName: 'role_id' },
  { tableName: 'sec_user_role_results', columnName: 'role_id' },
  { tableName: 'sec_user_roles', columnName: 'role_id' },
];

type RoleRow = {
  sec_role_id: number;
  name: string;
  focusId: unknown;
  description: unknown;
  isInternal: unknown;
};

type Assignment = {
  table: string;
  column: string;
  roleId: number;
  isActive: number;
};

type SqlCall = { sql: string; params: unknown[] };

function createStatefulQueryRunner(initial?: {
  roles?: RoleRow[];
  assignments?: Assignment[];
  fks?: Array<{ tableName: string; columnName: string }>;
}): {
  runner: QueryRunner;
  roles: RoleRow[];
  inserts: SqlCall[];
  deletes: SqlCall[];
  counts: number[];
} {
  const roles = [...(initial?.roles ?? [])];
  const assignments = [...(initial?.assignments ?? [])];
  const fks = initial?.fks ?? BASELINE_FKS;
  const inserts: SqlCall[] = [];
  const deletes: SqlCall[] = [];
  const counts: number[] = [];

  const runner = {
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      const compact = sql.replace(/\s+/g, ' ').trim();
      if (/information_schema\.KEY_COLUMN_USAGE/i.test(compact)) {
        return fks;
      }
      if (/^SELECT COUNT\(\*\)/i.test(compact)) {
        const table = compact.match(/FROM `([a-z0-9_]+)`/i)?.[1];
        const column = compact.match(/WHERE `([a-z0-9_]+)`/i)?.[1];
        const roleId = Number(params[0]);
        const activeOnly = /is_active/i.test(compact);
        const cnt = assignments.filter(
          (row) =>
            row.table === table &&
            row.column === column &&
            row.roleId === roleId &&
            (!activeOnly || row.isActive === 1),
        ).length;
        counts.push(cnt);
        return [{ cnt }];
      }
      if (/^SELECT name FROM sec_roles/i.test(compact)) {
        const roleId = Number(params[0]);
        return roles
          .filter((row) => row.sec_role_id === roleId)
          .map((row) => ({ name: row.name }));
      }
      if (/^INSERT/i.test(compact)) {
        inserts.push({ sql: compact, params: [...params] });
        const [id, name, focusId, description, isInternal] = params;
        const existing = roles.find((row) => row.sec_role_id === id);
        if (existing) {
          if (/INSERT\s+IGNORE/i.test(compact)) {
            return { affectedRows: 0 };
          }
          throw new Error(
            `Duplicate entry '${String(id)}' for key 'sec_roles.PRIMARY'`,
          );
        }
        roles.push({
          sec_role_id: id as number,
          name: name as string,
          focusId,
          description,
          isInternal,
        });
        return { affectedRows: 1 };
      }
      if (/^DELETE FROM sec_roles/i.test(compact)) {
        deletes.push({ sql: compact, params: [...params] });
        const roleId = Number(params[0]);
        for (let i = roles.length - 1; i >= 0; i -= 1) {
          if (roles[i].sec_role_id === roleId) {
            roles.splice(i, 1);
          }
        }
        return { affectedRows: 1 };
      }
      throw new Error(`unexpected SQL: ${compact}`);
    }),
  } as unknown as QueryRunner;

  return { runner, roles, inserts, deletes, counts };
}

describe('CreateOdsAdminRole1795000000000 (R-STF-013 AC.1)', () => {
  describe('source (raw file text)', () => {
    let src: string;

    beforeAll(() => {
      src = readFileSync(MIGRATION_FILE, 'utf8');
    });

    it('imports SecRolesEnum and RolesFocusEnum', () => {
      expect(src).toMatch(
        /import\s*\{\s*SecRolesEnum\s*\}\s*from\s*['"].*sec_role\.enum['"]/,
      );
      expect(src).toMatch(
        /import\s*\{\s*RolesFocusEnum\s*\}\s*from\s*['"].*roles-focus\.enum['"]/,
      );
    });

    it('exports only its migration class', () => {
      expect(src.match(/^export .+$/gm)).toEqual([
        'export class CreateOdsAdminRole1795000000000 implements MigrationInterface {',
      ]);
    });

    it('binds the role id and reads referencing FKs from information_schema', () => {
      expect(src).toMatch(/WHERE sec_role_id = \?/);
      expect(src).toContain('information_schema.KEY_COLUMN_USAGE');
      expect(src).toContain('REFERENCED_TABLE_NAME');
      expect(src).toContain('REFERENCED_COLUMN_NAME');
      expect(src).not.toMatch(/VALUES\s*\(\s*11\b/);
    });
  });

  describe('up()', () => {
    it('inserts ODS Admin at the next free id with application focus when the row is absent', async () => {
      const migration = new CreateOdsAdminRole1795000000000();
      const { runner, roles, inserts } = createStatefulQueryRunner();

      await migration.up(runner);

      expect(inserts).toHaveLength(1);
      expect(inserts[0].params).toEqual([
        SecRolesEnum.ODS_ADMIN,
        'ODS Admin',
        RolesFocusEnum.APPLICATION,
        expect.any(String),
        0,
      ]);
      expect(String(inserts[0].params[3]).length).toBeGreaterThan(0);
      expect(roles).toEqual([
        {
          sec_role_id: 11,
          name: 'ODS Admin',
          focusId: RolesFocusEnum.APPLICATION,
          description: inserts[0].params[3],
          isInternal: 0,
        },
      ]);
    });

    it('does nothing when sec_role_id 11 is already named ODS Admin', async () => {
      const migration = new CreateOdsAdminRole1795000000000();
      const { runner, roles, inserts } = createStatefulQueryRunner({
        roles: [
          {
            sec_role_id: 11,
            name: 'ODS Admin',
            focusId: RolesFocusEnum.APPLICATION,
            description: 'already there',
            isInternal: 0,
          },
        ],
      });

      await migration.up(runner);

      expect(inserts).toHaveLength(0);
      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe('ODS Admin');
      expect(roles[0].description).toBe('already there');
    });

    it('throws naming the other name when sec_role_id 11 is held by a different role', async () => {
      const migration = new CreateOdsAdminRole1795000000000();
      const { runner, roles, inserts } = createStatefulQueryRunner({
        roles: [
          {
            sec_role_id: 11,
            name: OTHER_NAME,
            focusId: 1,
            description: null,
            isInternal: 0,
          },
        ],
      });

      let thrown: string | null = null;
      try {
        await migration.up(runner);
      } catch (error) {
        thrown = (error as Error).message;
      }

      expect({
        thrown,
        inserted: inserts.length,
        name: roles[0]?.name ?? null,
      }).toEqual({
        thrown: expect.stringContaining(OTHER_NAME),
        inserted: 0,
        name: OTHER_NAME,
      });
    });
  });

  describe('down()', () => {
    it('refuses while an inactive sec_user_roles row holds the role, naming the table and the count', async () => {
      const migration = new CreateOdsAdminRole1795000000000();
      const { runner, roles, deletes, counts } = createStatefulQueryRunner({
        roles: [
          {
            sec_role_id: 11,
            name: 'ODS Admin',
            focusId: RolesFocusEnum.APPLICATION,
            description: 'seeded',
            isInternal: 0,
          },
        ],
        assignments: [
          {
            table: 'sec_user_roles',
            column: 'role_id',
            roleId: 11,
            isActive: 0,
          },
        ],
        fks: [{ tableName: 'sec_user_roles', columnName: 'role_id' }],
      });

      let thrown: string | null = null;
      try {
        await migration.down(runner);
      } catch (error) {
        thrown = (error as Error).message;
      }

      expect({
        thrown,
        deleted: deletes.length,
        roleStillThere: roles.length,
        counts,
      }).toEqual({
        thrown: expect.stringMatching(/sec_user_roles has 1/),
        deleted: 0,
        roleStillThere: 1,
        counts: [1],
      });
    });

    it('deletes the role when no referencing row exists', async () => {
      const migration = new CreateOdsAdminRole1795000000000();
      const { runner, roles, deletes, counts } = createStatefulQueryRunner({
        roles: [
          {
            sec_role_id: 11,
            name: 'ODS Admin',
            focusId: RolesFocusEnum.APPLICATION,
            description: 'seeded',
            isInternal: 0,
          },
        ],
      });

      await migration.down(runner);

      expect(counts).toEqual([0, 0, 0, 0, 0]);
      expect(deletes).toHaveLength(1);
      expect(deletes[0].params).toEqual([SecRolesEnum.ODS_ADMIN]);
      expect(roles).toHaveLength(0);
    });
  });
});
