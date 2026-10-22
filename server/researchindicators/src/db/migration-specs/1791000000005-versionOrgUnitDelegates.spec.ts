import { QueryRunner } from 'typeorm';
import { VersionOrgUnitDelegates1791000000005 } from '../migrations/1791000000005-versionOrgUnitDelegates';

/**
 * Migration `1791000000005` (D-ORG-24, design 3.3, P-15), unit level with a
 * recording query runner. Scope (KZ-017): this proves WHICH statements are
 * issued and that the guard fires BEFORE any DDL; that MySQL accepts them is
 * proven by running the migration (`migration:test:execute`, the K-006 gate) and
 * by `test/org-structure-schema.integration-spec.ts` on the real table.
 */
const CHARSET_ROW = [{ charset: 'utf8mb4', collation: 'utf8mb4_0900_ai_ci' }];

const runnerWith = (rowCount: number) => {
  const calls: string[] = [];
  const runner = {
    query: jest.fn(async (sql: string) => {
      calls.push(sql);
      if (/COUNT\(\*\)/i.test(sql)) return [{ total: String(rowCount) }];
      if (/information_schema\.COLUMNS/i.test(sql)) return CHARSET_ROW;
      return undefined;
    }),
  } as unknown as QueryRunner;
  return { runner, calls };
};

const ddl = (calls: string[]) =>
  calls.filter((sql) => /DROP TABLE|CREATE TABLE|ALTER TABLE/i.test(sql));

describe('VersionOrgUnitDelegates1791000000005', () => {
  describe.each(['up', 'down'] as const)('%s()', (direction) => {
    it('throws naming the row count, and issues no DDL, when delegate rows exist', async () => {
      const { runner, calls } = runnerWith(3);
      await expect(
        new VersionOrgUnitDelegates1791000000005()[direction](runner),
      ).rejects.toThrow(/org_unit_delegates holds 3 row\(s\)/);
      expect(ddl(calls)).toEqual([]);
    });

    it('rebuilds the table when it is empty', async () => {
      const { runner, calls } = runnerWith(0);
      await new VersionOrgUnitDelegates1791000000005()[direction](runner);
      const statements = ddl(calls);
      expect(statements[0]).toMatch(/^DROP TABLE `org_unit_delegates`$/);
      expect(statements[1]).toMatch(/CREATE TABLE `org_unit_delegates`/);
    });
  });

  it('up creates the version-keyed shape: version FK CASCADE, staff FK RESTRICT with the staff charset, unique (version, staff)', async () => {
    const { runner, calls } = runnerWith(0);
    await new VersionOrgUnitDelegates1791000000005().up(runner);
    const [, create, ...alters] = ddl(calls);

    expect(create).toMatch(/`org_unit_version_id` bigint NOT NULL/);
    expect(create).not.toMatch(/`org_unit_id`/);
    expect(create).toMatch(
      /`staff_carnet` varchar\(10\) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL/,
    );
    expect(create).toMatch(
      /UNIQUE INDEX `uq_org_unit_delegates_version_staff` \(`org_unit_version_id`, `staff_carnet`\)/,
    );
    expect(alters.join('\n')).toMatch(
      /FK_org_unit_delegates_org_unit_version_id` FOREIGN KEY \(`org_unit_version_id`\) REFERENCES `org_unit_versions`\(`id`\) ON DELETE CASCADE/,
    );
    expect(alters.join('\n')).toMatch(
      /FK_org_unit_delegates_staff_carnet` FOREIGN KEY \(`staff_carnet`\) REFERENCES `alliance_user_staff`\(`carnet`\) ON DELETE RESTRICT/,
    );
  });

  it('down restores the 1791000000003 shape (entry key, entry FK CASCADE)', async () => {
    const { runner, calls } = runnerWith(0);
    await new VersionOrgUnitDelegates1791000000005().down(runner);
    const [, create, ...alters] = ddl(calls);

    expect(create).toMatch(/`org_unit_id` bigint NOT NULL/);
    expect(create).not.toMatch(/org_unit_version_id/);
    expect(create).toMatch(
      /UNIQUE INDEX `uq_org_unit_delegates_unit_staff` \(`org_unit_id`, `staff_carnet`\)/,
    );
    expect(alters.join('\n')).toMatch(
      /FK_org_unit_delegates_org_unit_id` FOREIGN KEY \(`org_unit_id`\) REFERENCES `org_units`\(`id`\) ON DELETE CASCADE/,
    );
  });

  it('sends no statement with a question mark or a colon-word (named placeholders are on, server guide section 7)', async () => {
    for (const direction of ['up', 'down'] as const) {
      const { runner, calls } = runnerWith(0);
      await new VersionOrgUnitDelegates1791000000005()[direction](runner);
      for (const sql of calls) {
        // Same pattern named-placeholders uses; quoted strings are skipped by it.
        const unquoted = sql.replace(/'[^']*'/g, '');
        expect(unquoted).not.toMatch(/\?|:[a-zA-Z0-9]/);
      }
    }
  });
});
