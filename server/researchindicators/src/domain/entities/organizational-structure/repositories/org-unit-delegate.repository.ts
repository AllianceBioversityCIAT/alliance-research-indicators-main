import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrgUnitDelegate } from '../entities/org-unit-delegate.entity';

/** Raw row of the delegates query: a delegate of one version joined with its staff row. */
export interface DelegateStaffRawRow {
  org_unit_version_id: number | string;
  staff_carnet: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_active: number | null;
}

@Injectable()
export class OrgUnitDelegateRepository extends Repository<OrgUnitDelegate> {
  constructor(dataSource: DataSource) {
    super(OrgUnitDelegate, dataSource.createEntityManager());
  }

  /** Delegates of the given VERSIONS (D-ORG-24), joined with staff, in insertion order. */
  async findStaffByVersionIds(
    versionIds: number[],
  ): Promise<DelegateStaffRawRow[]> {
    if (versionIds.length === 0) return [];
    const placeholders = versionIds.map(() => '?').join(',');
    return this.query(
      `
      SELECT dl.org_unit_version_id, dl.staff_carnet, s.first_name, s.last_name,
             s.email, s.is_active
        FROM org_unit_delegates dl
        JOIN alliance_user_staff s ON s.carnet = dl.staff_carnet
       WHERE dl.org_unit_version_id IN (${placeholders})
       ORDER BY dl.org_unit_version_id, dl.id
      `,
      versionIds,
    );
  }
}
