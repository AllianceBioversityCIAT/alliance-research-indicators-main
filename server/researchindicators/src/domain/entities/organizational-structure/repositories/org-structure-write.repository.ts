import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { OrgUnit } from '../entities/org-unit.entity';
import { OrgUnitVersion } from '../entities/org-unit-version.entity';
import { OrgUnitDelegate } from '../entities/org-unit-delegate.entity';
import { OrgUnitChangeLog } from '../entities/org-unit-change-log.entity';
import { GraphVersion } from '../org-hierarchy.util';
import { TimelineVersion } from '../org-version-timeline.util';
import { OrgChangeAction } from '../organizational-structure.types';

export interface StaffLookupRow {
  carnet: string;
  isActive: boolean;
}

export interface StaffSearchRow {
  carnet: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

/** The persistence seam of the save engine. Every write takes the transaction's manager. */
@Injectable()
export class OrgStructureWriteRepository {
  constructor(private readonly dataSource: DataSource) {}

  transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }

  /** `SELECT ... FOR UPDATE` on the entry row: serializes concurrent saves of one entry (design 5.2). */
  async lockUnit(manager: EntityManager, id: number): Promise<OrgUnit | null> {
    const rows: OrgUnit[] = await manager.query(
      `SELECT id, code, status, status_from_year, successor_id
         FROM org_units WHERE id = ? FOR UPDATE`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findUnit(manager: EntityManager, id: number): Promise<OrgUnit | null> {
    return manager.findOne(OrgUnit, { where: { id } });
  }

  /** Case-insensitive through the column collation (R-ORG-002); any status counts. */
  async codeTaken(
    manager: EntityManager,
    code: string,
    excludeId?: number,
  ): Promise<boolean> {
    const rows = await manager.query(
      `SELECT id FROM org_units WHERE code = ? AND id <> ? LIMIT 1`,
      [code, excludeId ?? 0],
    );
    return rows.length > 0;
  }

  /** Every code of the form ORG-<digits>, any case, any status (design 5.6). */
  async findProposableCodes(manager?: EntityManager): Promise<string[]> {
    const rows: Array<{ code: string }> = await (
      manager ?? this.dataSource
    ).query(`SELECT code FROM org_units WHERE code REGEXP '^ORG-[0-9]+$'`);
    return rows.map((row) => row.code);
  }

  async insertUnit(
    manager: EntityManager,
    code: string,
    userId: number,
  ): Promise<number> {
    const result = await manager.insert(OrgUnit, {
      code,
      status: 'active',
      created_by: userId,
    });
    return Number(result.identifiers[0].id);
  }

  async updateUnitCode(
    manager: EntityManager,
    id: number,
    code: string,
    userId: number,
  ): Promise<void> {
    await manager.update(OrgUnit, { id }, { code, updated_by: userId });
  }

  async loadVersions(
    manager: EntityManager,
    unitId: number,
  ): Promise<TimelineVersion[]> {
    const rows = await manager.find(OrgUnitVersion, {
      where: { org_unit_id: unitId },
      order: { valid_from_year: 'ASC' },
    });
    return rows.map((row) => ({
      id: Number(row.id),
      from: Number(row.valid_from_year),
      to: row.valid_to_year === null ? null : Number(row.valid_to_year),
      name: row.name,
      acronym: row.acronym ?? null,
      levelId: Number(row.level_value_id),
      parentId: row.parent_id === null ? null : Number(row.parent_id),
      directorCarnet: row.director_carnet ?? null,
    }));
  }

  /** Every version of every entry, for the hierarchy check (one read, ~500 entries). */
  async loadGraphVersions(manager: EntityManager): Promise<GraphVersion[]> {
    const rows: Array<{
      org_unit_id: number | string;
      valid_from_year: number;
      valid_to_year: number | null;
      parent_id: number | string | null;
      level_value_id: number | string;
    }> = await manager.query(
      `SELECT org_unit_id, valid_from_year, valid_to_year, parent_id, level_value_id
         FROM org_unit_versions`,
    );
    return rows.map((row) => ({
      unitId: Number(row.org_unit_id),
      from: Number(row.valid_from_year),
      to: row.valid_to_year === null ? null : Number(row.valid_to_year),
      parentId: row.parent_id === null ? null : Number(row.parent_id),
      levelId: Number(row.level_value_id),
    }));
  }

  async insertVersion(
    manager: EntityManager,
    unitId: number,
    version: TimelineVersion,
    userId: number,
  ): Promise<void> {
    await manager.insert(OrgUnitVersion, {
      org_unit_id: unitId,
      valid_from_year: version.from,
      valid_to_year: version.to,
      name: version.name,
      acronym: version.acronym,
      level_value_id: version.levelId,
      parent_id: version.parentId,
      director_carnet: version.directorCarnet,
      created_by: userId,
    });
  }

  async updateVersion(
    manager: EntityManager,
    version: TimelineVersion,
    userId: number,
  ): Promise<void> {
    await manager.update(
      OrgUnitVersion,
      { id: version.id },
      {
        valid_from_year: version.from,
        valid_to_year: version.to,
        name: version.name,
        acronym: version.acronym,
        level_value_id: version.levelId,
        parent_id: version.parentId,
        director_carnet: version.directorCarnet,
        updated_by: userId,
      },
    );
  }

  /** Versions removed by a lifecycle change (a version that would cover no year, design 5.4). */
  async deleteVersions(
    manager: EntityManager,
    unitId: number,
    versionIds: number[],
  ): Promise<void> {
    if (versionIds.length === 0) return;
    const placeholders = versionIds.map(() => '?').join(',');
    await manager.query(
      `DELETE FROM org_unit_versions WHERE org_unit_id = ? AND id IN (${placeholders})`,
      [unitId, ...versionIds],
    );
  }

  /** Inactivate, reactivate and logical delete: the entry's status fields (design 3.1). */
  async updateUnitStatus(
    manager: EntityManager,
    id: number,
    fields: {
      status: 'active' | 'inactive' | 'deleted';
      statusFromYear: number | null;
      successorId: number | null;
    },
    userId: number,
  ): Promise<void> {
    await manager.update(
      OrgUnit,
      { id },
      {
        status: fields.status,
        status_from_year: fields.statusFromYear,
        successor_id: fields.successorId,
        updated_by: userId,
      },
    );
  }

  /**
   * Physical delete (design 5.5). Versions and delegates go with the entry
   * through their `ON DELETE CASCADE` foreign keys; the change log has NO foreign
   * key and survives (NFR-ORG-003).
   */
  async deleteUnit(manager: EntityManager, id: number): Promise<void> {
    await manager.query(`DELETE FROM org_units WHERE id = ?`, [id]);
  }

  /** Entries that name this one as their successor (`successor_id` is RESTRICT, so they block a physical delete). */
  async findSuccessorReferrers(
    manager: EntityManager,
    id: number,
  ): Promise<Array<{ id: number; code: string }>> {
    const rows: Array<{ id: number | string; code: string }> =
      await manager.query(
        `SELECT id, code FROM org_units WHERE successor_id = ? ORDER BY id`,
        [id],
      );
    return rows.map((row) => ({ id: Number(row.id), code: row.code }));
  }

  /** Current delegates of an entry in insertion order (R-ORG-017). */
  async loadDelegateCarnets(
    manager: EntityManager,
    unitId: number,
  ): Promise<string[]> {
    const rows = await manager.find(OrgUnitDelegate, {
      where: { org_unit_id: unitId },
      order: { id: 'ASC' },
    });
    return rows.map((row) => row.staff_carnet);
  }

  async addDelegates(
    manager: EntityManager,
    unitId: number,
    carnets: string[],
    userId: number,
  ): Promise<void> {
    if (carnets.length === 0) return;
    await manager.insert(
      OrgUnitDelegate,
      carnets.map((staff_carnet) => ({
        org_unit_id: unitId,
        staff_carnet,
        created_by: userId,
      })),
    );
  }

  async removeDelegates(
    manager: EntityManager,
    unitId: number,
    carnets: string[],
  ): Promise<void> {
    if (carnets.length === 0) return;
    const placeholders = carnets.map(() => '?').join(',');
    await manager.query(
      `DELETE FROM org_unit_delegates WHERE org_unit_id = ? AND staff_carnet IN (${placeholders})`,
      [unitId, ...carnets],
    );
  }

  /** Staff rows by carnet; the carnet comes back as stored (the column collation is case-insensitive). */
  async findStaff(
    manager: EntityManager,
    carnets: string[],
  ): Promise<StaffLookupRow[]> {
    if (carnets.length === 0) return [];
    const placeholders = carnets.map(() => '?').join(',');
    const rows: Array<{ carnet: string; is_active: number }> =
      await manager.query(
        `SELECT carnet, is_active FROM alliance_user_staff WHERE carnet IN (${placeholders})`,
        carnets,
      );
    return rows.map((row) => ({
      carnet: row.carnet,
      isActive: Number(row.is_active) === 1,
    }));
  }

  async insertLog(
    manager: EntityManager,
    entry: {
      unitId: number;
      action: OrgChangeAction;
      appliesFromYear: number | null;
      backdated: boolean;
      changes: OrgUnitChangeLog['changes'];
      userId: number;
    },
  ): Promise<void> {
    await manager.insert(OrgUnitChangeLog, {
      org_unit_id: entry.unitId,
      action: entry.action,
      applies_from_year: entry.appliesFromYear,
      backdated: entry.backdated,
      changes: entry.changes,
      created_by: entry.userId,
    });
  }

  /**
   * B4 (D-ORG-8, P-14): active staff only (`is_active = 1`), name or email or
   * full name. The three LIKEs are parenthesized: `AND` binds tighter than
   * `OR`, and the unparenthesized form of the existing staff search returns
   * inactive people whenever the term matches their last name or email (P-10).
   * `%`, `_` and `\` in the term are escaped.
   */
  async searchActiveStaff(
    term: string,
    limit: number,
  ): Promise<StaffSearchRow[]> {
    const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    return this.dataSource.query(
      `SELECT carnet, first_name, last_name, email
         FROM alliance_user_staff
        WHERE is_active = 1
          AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
               OR CONCAT_WS(' ', first_name, last_name) LIKE ?)
        ORDER BY first_name, last_name
        LIMIT ${Number(limit)}`,
      [like, like, like, like],
    );
  }
}
