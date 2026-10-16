import { QueryRunner } from 'typeorm';
import { CreatePrmsWebhookDeliveryTable1790086170692 } from '../migrations/1790086170692-createPrmsWebhookDeliveryTable';

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

const PLACEHOLDER = /(?:\?)|(?::(?:\d+|[a-zA-Z][a-zA-Z0-9_]*))/;

describe('CreatePrmsWebhookDeliveryTable1790086170692', () => {
  describe('up()', () => {
    let calls: string[];
    let createTableSql: string;

    beforeAll(async () => {
      const migration = new CreatePrmsWebhookDeliveryTable1790086170692();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.up(runner);
      calls = recorded;
      const createTableCalls = calls.filter((sql) => /CREATE TABLE/i.test(sql));
      expect(createTableCalls).toHaveLength(1);
      createTableSql = createTableCalls[0];
    });

    it('issues a single statement and no ALTER', () => {
      expect(calls).toHaveLength(1);
      expect(createTableSql).not.toMatch(/ALTER TABLE/i);
    });

    it('creates result_prms_sync_history with design section 4 columns and nullability', () => {
      expect(createTableSql).toMatch(
        /`id`\s+bigint\s+NOT NULL AUTO_INCREMENT/i,
      );
      expect(createTableSql).toMatch(/`delivery_id`\s+varchar\(191\)\s+NULL/i);
      expect(createTableSql).toMatch(/`occurred_at`\s+timestamp\s+NOT NULL/i);
      expect(createTableSql).toMatch(
        /`environment`\s+varchar\(20\)\s+NOT NULL/i,
      );
      expect(createTableSql).toMatch(
        /`correlation_outcome`\s+varchar\(40\)\s+NOT NULL/i,
      );
      // No result_id column: an overwrite deletes it and orphans the history.
      expect(createTableSql).not.toMatch(/`result_id`\s+bigint/i);
      expect(createTableSql).toMatch(
        /`result_official_code`\s+varchar\(191\)\s+NULL/i,
      );
      expect(createTableSql).toMatch(/`result_year`\s+year\s+NULL/i);
      expect(createTableSql).toMatch(/`prms_result_id`\s+bigint\s+NULL/i);
      expect(createTableSql).toMatch(/`prms_result_code`\s+bigint\s+NULL/i);
      expect(createTableSql).toMatch(/`decision`\s+varchar\(20\)\s+NULL/i);
      expect(createTableSql).toMatch(/`justification`\s+text\s+NULL/i);
      expect(createTableSql).toMatch(/`decided_at`\s+timestamp\s+NULL/i);
      expect(createTableSql).toMatch(/`raw_body`\s+json\s+NULL/i);
      expect(createTableSql).toMatch(/`raw_headers`\s+json\s+NULL/i);
      expect(createTableSql).toMatch(
        /`processing_state`\s+varchar\(20\)\s+NOT NULL/i,
      );
      expect(createTableSql).toMatch(/`processing_error`\s+text\s+NULL/i);
      expect(createTableSql).toMatch(/`duplicate_of_id`\s+bigint\s+NULL/i);
    });

    it('creates the seven Pivot-added columns with the exact types and nullability (event_source NOT NULL, the rest nullable)', () => {
      expect(createTableSql).toMatch(
        /`event_source`\s+varchar\(10\)\s+NOT NULL/i,
      );
      expect(createTableSql).toMatch(/`status`\s+varchar\(30\)\s+NULL/i);
      expect(createTableSql).toMatch(/`actor_user_id`\s+bigint\s+NULL/i);
      expect(createTableSql).toMatch(
        /`reviewer_name`\s+varchar\(255\)\s+NULL/i,
      );
      expect(createTableSql).toMatch(
        /`reviewer_role`\s+varchar\(191\)\s+NULL/i,
      );
      expect(createTableSql).toMatch(
        /`science_program_code`\s+varchar\(20\)\s+NULL/i,
      );
      expect(createTableSql).toMatch(/`changes`\s+json\s+NULL/i);
    });

    it('carries the AuditableEntity columns, with created_by NULL and is_active defaulting TRUE', () => {
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

    it('declares id as the sole primary key and the three non-unique indexes', () => {
      expect(createTableSql).toMatch(/PRIMARY KEY\s*\(\s*`id`\s*\)/i);
      expect(createTableSql).toMatch(
        /INDEX\s+`idx_result_prms_sync_history_delivery_id`\s*\(\s*`delivery_id`\s*\)/i,
      );
      expect(createTableSql).toMatch(
        /INDEX\s+`idx_result_prms_sync_history_occurred_at`\s*\(\s*`occurred_at`\s*\)/i,
      );
      expect(createTableSql).toMatch(
        /INDEX\s+`idx_result_prms_sync_history_code_year`\s*\(\s*`result_official_code`\s*,\s*`result_year`\s*\)/i,
      );
    });

    it('does not declare a foreign key, a unique index, or a MySQL ENUM', () => {
      expect(createTableSql).not.toMatch(/FOREIGN KEY/i);
      expect(createTableSql).not.toMatch(/REFERENCES/i);
      expect(createTableSql).not.toMatch(/UNIQUE/i);
      expect(createTableSql).not.toMatch(/\bENUM\b/i);
    });

    it('uses the required charset and collation', () => {
      expect(createTableSql).toMatch(/DEFAULT CHARSET=utf8mb4/i);
      expect(createTableSql).toMatch(/COLLATE=utf8mb4_unicode_520_ci/i);
    });

    it('sends no bind placeholders to the driver', () => {
      for (const sql of calls) {
        expect(sql.match(PLACEHOLDER)).toBeNull();
      }
    });
  });

  describe('down()', () => {
    it('drops only result_prms_sync_history', async () => {
      const migration = new CreatePrmsWebhookDeliveryTable1790086170692();
      const { runner, calls } = createRecordingQueryRunner();
      await migration.down(runner);

      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatch(/DROP TABLE `result_prms_sync_history`/i);
      expect(calls[0]).not.toMatch(/FOREIGN KEY/i);
    });
  });
});
