import { QueryRunner } from 'typeorm';
import { CreateResultPrmsSyncLogTable1789479131116 } from '../migrations/1789479131116-createResultPrmsSyncLogTable';

function createRecordingQueryRunner(): {
  runner: QueryRunner;
  calls: string[];
} {
  const calls: string[] = [];
  const runner = {
    query: jest.fn(async (sql: string) => {
      calls.push(sql);
      return undefined;
    }),
  } as unknown as QueryRunner;
  return { runner, calls };
}

describe('CreateResultPrmsSyncLogTable1789479131116', () => {
  describe('up()', () => {
    let calls: string[];
    let createTableSql: string;
    let alterCalls: string[];

    beforeAll(async () => {
      const migration = new CreateResultPrmsSyncLogTable1789479131116();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.up(runner);
      calls = recorded;
      const createTableCalls = calls.filter((sql) => /CREATE TABLE/i.test(sql));
      expect(createTableCalls).toHaveLength(1);
      createTableSql = createTableCalls[0];
      alterCalls = calls.filter((sql) => /ALTER TABLE/i.test(sql));
    });

    it('creates result_prms_sync_log with every design-specified business column and nullability', () => {
      expect(createTableSql).toMatch(
        /`id`\s+bigint\s+NOT NULL AUTO_INCREMENT/i,
      );
      expect(createTableSql).toMatch(/`result_id`\s+bigint\s+NOT NULL/i);
      expect(createTableSql).toMatch(/`attempt_number`\s+int\s+NOT NULL/i);
      expect(createTableSql).toMatch(
        /`environment`\s+varchar\(20\)\s+NOT NULL/i,
      );
      expect(createTableSql).toMatch(/`prms_type`\s+varchar\(50\)\s+NULL/i);
      expect(createTableSql).toMatch(/`outcome`\s+varchar\(40\)\s+NOT NULL/i);
      expect(createTableSql).toMatch(/`http_status`\s+int\s+NULL/i);
      expect(createTableSql).toMatch(/`request_id`\s+varchar\(191\)\s+NULL/i);
      expect(createTableSql).toMatch(
        /`external_reference`\s+varchar\(191\)\s+NULL/i,
      );
      expect(createTableSql).toMatch(/`request_payload`\s+json\s+NULL/i);
      expect(createTableSql).toMatch(/`response_body`\s+json\s+NULL/i);
      expect(createTableSql).toMatch(/`failure_reason`\s+text\s+NULL/i);
    });

    it('declares id as the sole primary key and includes both required indexes', () => {
      expect(createTableSql).toMatch(/PRIMARY KEY\s*\(\s*`id`\s*\)/i);
      expect(createTableSql).toMatch(
        /INDEX\s+`idx_result_prms_sync_log_result`\s*\(\s*`result_id`\s*\)/i,
      );
      expect(createTableSql).toMatch(
        /INDEX\s+`idx_result_prms_sync_log_request_id`\s*\(\s*`request_id`\s*\)/i,
      );
    });

    it('carries the full inline AuditableEntity column set', () => {
      expect(createTableSql).toMatch(
        /`created_at`\s+timestamp\(6\)\s+NOT NULL DEFAULT CURRENT_TIMESTAMP\(6\)/i,
      );
      expect(createTableSql).toMatch(/`created_by`\s+bigint\s+NULL/i);
      expect(createTableSql).toMatch(
        /`updated_at`\s+timestamp\(6\)\s+NULL DEFAULT CURRENT_TIMESTAMP\(6\) ON UPDATE CURRENT_TIMESTAMP\(6\)/i,
      );
      expect(createTableSql).toMatch(/`updated_by`\s+bigint\s+NULL/i);
      expect(createTableSql).toMatch(
        /`is_active`\s+tinyint\s+NOT NULL DEFAULT 1/i,
      );
      expect(createTableSql).toMatch(/`deleted_at`\s+timestamp\s+NULL/i);
    });

    it('uses the required charset and collation', () => {
      expect(createTableSql).toMatch(/DEFAULT CHARSET=utf8mb4/i);
      expect(createTableSql).toMatch(/COLLATE=utf8mb4_unicode_520_ci/i);
    });

    it('adds the result foreign key separately with default restrictive behavior', () => {
      expect(alterCalls).toHaveLength(1);
      expect(alterCalls[0]).toMatch(
        /FOREIGN KEY\s*\(\s*`result_id`\s*\)\s*REFERENCES\s*`results`\s*\(\s*`result_id`\s*\)/i,
      );
      expect(alterCalls[0]).not.toMatch(/ON DELETE|ON UPDATE/i);
    });
  });

  describe('down()', () => {
    it('drops the result foreign key before dropping only result_prms_sync_log', async () => {
      const migration = new CreateResultPrmsSyncLogTable1789479131116();
      const { runner, calls } = createRecordingQueryRunner();
      await migration.down(runner);

      expect(calls).toHaveLength(2);
      expect(calls[0]).toMatch(
        /ALTER TABLE `result_prms_sync_log` DROP FOREIGN KEY `FK_result_prms_sync_log_result_id`/i,
      );
      expect(calls[1]).toMatch(/DROP TABLE `result_prms_sync_log`/i);
    });
  });
});
