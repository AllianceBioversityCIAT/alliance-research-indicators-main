import { OrgLevelCode, OrgStaffRef, OrgUnitStatus, OrgYearViewRow } from '@shared/interfaces/org-structure.interface';

// Spec-only helpers shared by the Organizational Structure specs (not imported by product code).

export const staff = (carnet: string, name: string, isActiveStaff = true): OrgStaffRef => ({
  carnet,
  name,
  email: `${carnet}@example.org`,
  isActiveStaff
});

interface RowOptions {
  id: number;
  code: string;
  levelCode: OrgLevelCode;
  name: string;
  parentId?: number | null;
  parentCode?: string | null;
  parentName?: string | null;
  acronym?: string | null;
  status?: OrgUnitStatus;
  statusFromYear?: number | null;
  scheduledFromYear?: number | null;
  director?: OrgStaffRef | null;
  delegates?: OrgStaffRef[];
  from?: number;
}

const LEVEL_IDS: Record<OrgLevelCode, number> = { L1: 20, L2: 21, L3: 22, L4: 23 };

export const row = (o: RowOptions): OrgYearViewRow => ({
  id: o.id,
  code: o.code,
  status: o.status ?? 'active',
  statusFromYear: o.statusFromYear ?? null,
  scheduledFromYear: o.scheduledFromYear ?? null,
  delegates: o.delegates ?? [],
  version: {
    from: o.from ?? 2026,
    to: null,
    name: o.name,
    acronym: o.acronym ?? null,
    levelId: LEVEL_IDS[o.levelCode],
    levelCode: o.levelCode,
    parentId: o.parentId ?? null,
    parentCode: o.parentCode ?? null,
    parentName: o.parentName ?? null,
    director: o.director ?? null
  }
});
