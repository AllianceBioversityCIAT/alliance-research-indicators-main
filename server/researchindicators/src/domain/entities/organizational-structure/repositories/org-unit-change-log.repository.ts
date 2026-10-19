import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrgUnitChangeLog } from '../entities/org-unit-change-log.entity';

/** Raw row of the log read (snake_case, driver types). `changes` is JSON, which the driver may return as a string. */
export interface ChangeLogRawRow {
  id: number | string;
  org_unit_id: number | string;
  action: string;
  applies_from_year: number | null;
  backdated: number | boolean;
  changes: string | Record<string, { old: unknown; new: unknown }> | null;
  created_at: Date | string;
  created_by: number | string | null;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string | null;
}

/**
 * READ-ONLY access to the append-only log (R-ORG-009, NFR-ORG-003). It extends
 * `Repository` only for the entity wiring; the log is written solely by
 * `OrgStructureWriteRepository.insertLog` inside the save transaction, and a
 * unit test scans the module for any other write to the table.
 */
@Injectable()
export class OrgUnitChangeLogRepository extends Repository<OrgUnitChangeLog> {
  constructor(dataSource: DataSource) {
    super(OrgUnitChangeLog, dataSource.createEntityManager());
  }

  /** Newest first. No existence check on the entry: the log outlives a physical delete. */
  async findRowsByUnit(unitId: number): Promise<ChangeLogRawRow[]> {
    return this.query(
      `
      SELECT l.id, l.org_unit_id, l.action, l.applies_from_year, l.backdated,
             l.changes, l.created_at, l.created_by,
             su.first_name AS user_first_name,
             su.last_name AS user_last_name,
             su.email AS user_email
        FROM org_unit_change_log l
        LEFT JOIN sec_users su ON su.sec_user_id = l.created_by
       WHERE l.org_unit_id = ?
       ORDER BY l.created_at DESC, l.id DESC
      `,
      [unitId],
    );
  }
}
