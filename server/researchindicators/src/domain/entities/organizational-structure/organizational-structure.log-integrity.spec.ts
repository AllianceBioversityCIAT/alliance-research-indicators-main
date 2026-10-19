import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';

/**
 * R-ORG-009 AC.2 / NFR-ORG-003: the change log is append-only, and the ONLY
 * writer is the service's log writer (`OrgStructureWriteRepository.insertLog`,
 * called inside the save transaction). A route inventory proves no HTTP route
 * edits the log; this scan proves no OTHER code path in the module writes the
 * table either (a handler, the read service, a second repository).
 *
 * What it cannot reach (KZ-017): it reads source TEXT of this module only. A
 * write made from another module, through a variable table name, or through a
 * dynamically built query would not match; the real database proves the
 * survival half (`test/org-structure-lifecycle.integration-spec.ts`).
 */
const root = __dirname;
const sources: Array<{ file: string; text: string }> = [];
const walk = (dir: string) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      sources.push({
        file: relative(root, full).replace(/\\/g, '/'),
        text: readFileSync(full, 'utf-8'),
      });
    }
  }
};
walk(root);

const WRITE_SQL =
  /(INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(\s+TABLE)?|REPLACE\s+INTO)\s+`?org_unit_change_log/i;
const WRITE_ORM =
  /\.(insert|save|update|delete|remove|softDelete|upsert|clear)\(\s*OrgUnitChangeLog\b/;

describe('change log is append-only in code (R-ORG-009 AC.2, NFR-ORG-003)', () => {
  it('discovers the module sources (the scan is not vacuous)', () => {
    expect(sources.map((s) => s.file)).toEqual(
      expect.arrayContaining([
        'organizational-structure.service.ts',
        'organizational-structure.controller.ts',
        'repositories/org-structure-write.repository.ts',
        'repositories/org-unit-change-log.repository.ts',
      ]),
    );
  });

  it('no module file other than the write repository writes the log table', () => {
    const offenders = sources
      .filter(
        (s) => s.file !== 'repositories/org-structure-write.repository.ts',
      )
      .filter((s) => WRITE_SQL.test(s.text) || WRITE_ORM.test(s.text))
      .map((s) => s.file);
    expect(offenders).toEqual([]);
  });

  it('the write repository only ever INSERTs into the log (never update/delete)', () => {
    const text = sources.find(
      (s) => s.file === 'repositories/org-structure-write.repository.ts',
    ).text;
    expect(text).toMatch(/manager\.insert\(OrgUnitChangeLog/);
    expect(text).not.toMatch(/(UPDATE|DELETE\s+FROM)\s+`?org_unit_change_log/i);
    expect(text).not.toMatch(
      /\.(save|update|delete|remove|upsert)\(\s*OrgUnitChangeLog\b/,
    );
  });

  it('only the service calls `insertLog`, and the controller touches no repository', () => {
    const callers = sources
      .filter((s) => /\binsertLog\(/.test(s.text))
      .map((s) => s.file)
      .sort();
    expect(callers).toEqual([
      'organizational-structure.service.ts',
      'repositories/org-structure-write.repository.ts',
    ]);
    const controller = sources.find(
      (s) => s.file === 'organizational-structure.controller.ts',
    ).text;
    expect(controller).not.toMatch(/Repository/);
  });

  it('the read-side log repository exposes only a read of its own (no write method)', () => {
    const text = sources.find(
      (s) => s.file === 'repositories/org-unit-change-log.repository.ts',
    ).text;
    expect(text).not.toMatch(/async\s+(insert|save|update|delete|remove)\w*\(/);
  });

  it('the scan really can fail: it flags a synthetic write to the log table', () => {
    expect(WRITE_SQL.test('DELETE FROM org_unit_change_log WHERE id = 1')).toBe(
      true,
    );
    expect(WRITE_ORM.test('repo.save(OrgUnitChangeLog, row)')).toBe(true);
    expect(WRITE_ORM.test('manager.find(OrgUnitChangeLog, {})')).toBe(false);
    expect(WRITE_ORM.test('manager.update(OrgUnitChangeLog, {}, {})')).toBe(
      true,
    );
  });
});
