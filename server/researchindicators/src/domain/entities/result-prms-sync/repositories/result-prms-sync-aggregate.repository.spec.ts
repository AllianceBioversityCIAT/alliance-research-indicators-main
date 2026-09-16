import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { InstitutionRolesEnum } from '../../institution-roles/enums/institution-roles.enum';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';
import { UserRolesEnum } from '../../user-roles/enum/user-roles.enum';
import { ResultPrmsSyncAggregateRepository } from './result-prms-sync-aggregate.repository';

const empty = async () => [];

describe('ResultPrmsSyncAggregateRepository', () => {
  const query = jest.fn();
  const dataSource = { query } as unknown as DataSource;
  const appConfig = {
    ARI_SECONDARY_MYSQL_NAME: 'secondary_db',
  } as unknown as AppConfig;
  const repository = new ResultPrmsSyncAggregateRepository(
    dataSource,
    appConfig,
  );

  beforeEach(() => {
    query.mockReset();
  });

  const mockQueries = (overrides: Record<string, unknown[]> = {}) => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM results r')) {
        return overrides.header ?? [];
      }
      if (sql.includes('FROM result_users ru')) {
        return overrides.contact ?? [];
      }
      if (sql.includes('FROM submission_history sh')) {
        return overrides.submission ?? [];
      }
      if (sql.includes('FROM result_contracts rc')) {
        return overrides.contracts ?? [];
      }
      if (sql.includes('FROM result_pool_funding_alignment a')) {
        return overrides.programs ?? [];
      }
      if (sql.includes('FROM result_regions rr')) {
        return overrides.regions ?? [];
      }
      if (
        sql.includes('FROM result_countries rc') &&
        sql.includes('clarisa_sub_nationals')
      ) {
        return overrides.subnationals ?? [];
      }
      if (sql.includes('FROM result_countries rc')) {
        return overrides.countries ?? [];
      }
      if (
        sql.includes('FROM result_institutions ri') &&
        sql.includes('ci.code AS institution_id')
      ) {
        return overrides.partners ?? [];
      }
      if (sql.includes('FROM result_institutions ri')) {
        return overrides.implementingOrgs ?? [];
      }
      if (sql.includes('FROM result_evidences re')) {
        return overrides.evidence ?? [];
      }
      if (sql.includes('FROM result_capacity_sharing')) {
        return overrides.capacity ?? [];
      }
      if (sql.includes('clarisa_innovation_types')) {
        return overrides.innovationType ?? [];
      }
      if (sql.includes('clarisa_innovation_readiness_levels')) {
        return overrides.innovationReadiness ?? [];
      }
      if (sql.includes('FROM result_innovation_dev')) {
        return overrides.innovationDev ?? [];
      }
      if (sql.includes('FROM result_policy_change')) {
        return overrides.policy ?? [];
      }
      if (sql.includes('FROM result_innovation_use')) {
        return overrides.innovationUse ?? [];
      }
      if (sql.includes('FROM result_actors')) {
        return overrides.actors ?? [];
      }
      if (sql.includes('FROM result_institution_types')) {
        return overrides.institutionTypes ?? [];
      }
      if (sql.includes('FROM result_quantifications')) {
        return overrides.quantifications ?? [];
      }
      return empty();
    });
  };

  const headerRow = {
    result_id: '11',
    result_official_code: '1441061',
    indicator_id: '1',
    title: 'Loaded title',
    description: 'Loaded description',
    geo_scope_id: '50',
    is_partner_not_applicable: 0,
    created_at: '2024-03-01T10:00:00.000Z',
    created_by_email: 'ada.lovelace@cgiar.org',
    created_by_first_name: 'Ada',
    created_by_last_name: 'Lovelace',
  };

  it('returns null when the result is missing', async () => {
    mockQueries();
    await expect(repository.loadByResultId(42)).resolves.toBeNull();
    expect(query.mock.calls[0][1]).toEqual([42]);
    expect(query.mock.calls[0][0]).toContain('secondary_db.sec_users');
  });

  it('loads the aggregate without opening HTTP and coerces tinyint booleans', async () => {
    mockQueries({
      header: [
        {
          result_id: '11',
          result_official_code: '1441061',
          indicator_id: '1',
          title: 'Loaded title',
          description: 'Loaded description',
          geo_scope_id: '50',
          is_partner_not_applicable: 1,
          created_at: '2024-03-01T10:00:00.000Z',
          created_by_email: 'ada.lovelace@cgiar.org',
          created_by_first_name: 'Ada',
          created_by_last_name: 'Lovelace',
        },
      ],
      contact: [
        {
          email: 'ada.lovelace@cgiar.org',
          first_name: 'Ada',
          last_name: 'Lovelace',
        },
      ],
      submission: [
        {
          created_at: '2025-06-15T14:30:00.000Z',
          submission_comment: 'Approved for PRMS sync',
          email: 'ada.lovelace@cgiar.org',
          first_name: 'Ada',
          last_name: 'Lovelace',
        },
      ],
      contracts: [
        {
          agreement_id: 'D-1441061',
          description: 'Capacity sharing grant',
          ubwClientDescription: 'ExCIAT',
          is_primary: 1,
        },
      ],
      programs: [
        {
          sp_code: 'SP01',
          sp_role: 'PRIMARY',
          toc_result_title: 'Primary ToC result for SP01',
          indicator_description: 'Primary indicator description for SP01',
          aligns_with_toc: 1,
        },
        {
          sp_code: 'SP99',
          sp_role: null,
          toc_result_title: null,
          indicator_description: null,
          aligns_with_toc: 0,
        },
      ],
      evidence: [
        {
          link: 'https://example.org/cs-evidence',
          description: 'Public capacity-sharing evidence',
          is_private: 0,
        },
        {
          link: 'https://intranet.example.org/secret',
          description: 'Confidential',
          is_private: 1,
        },
      ],
      partners: [
        {
          institution_id: '12',
          acronym: 'FAO',
          name: 'Food and Agriculture Organization',
        },
      ],
      capacity: [{ result_id: 11, session_participants_female: 3 }],
    });

    const aggregate = await repository.loadByResultId(11);

    expect(aggregate).not.toBeNull();
    expect(aggregate?.is_partner_not_applicable).toBe(true);
    expect(aggregate?.primary_contract?.is_primary).toBe(true);
    expect(aggregate?.science_programs[0].aligns_with_toc).toBe(true);
    expect(aggregate?.science_programs[1].sp_role).toBeNull();
    expect(aggregate?.evidence[0].is_private).toBe(false);
    expect(aggregate?.evidence[1].is_private).toBe(true);
    expect(aggregate?.lead_contact?.email).toBe('ada.lovelace@cgiar.org');
    expect(aggregate?.type_slices?.capacity_sharing).toEqual({
      result_id: 11,
      session_participants_female: 3,
    });

    const contactCall = query.mock.calls.find((call) =>
      String(call[0]).includes('FROM result_users ru'),
    );
    expect(contactCall?.[1]).toEqual([11, UserRolesEnum.MAIN_CONTACT]);

    const submissionCall = query.mock.calls.find((call) =>
      String(call[0]).includes('FROM submission_history sh'),
    );
    expect(submissionCall?.[1]).toEqual([11, ResultStatusEnum.APPROVED]);

    const partnerCall = query.mock.calls.find((call) =>
      String(call[0]).includes('FROM result_institutions ri'),
    );
    expect(partnerCall?.[1]).toEqual([11, InstitutionRolesEnum.PARTNERS]);
  });

  it('resolves creator and submitted_by staff by carnet first, then a guarded deterministic email fallback (homologation.md §4; DC-1 stays guarded)', async () => {
    mockQueries({
      header: [
        {
          result_id: '11',
          result_official_code: '1441061',
          indicator_id: '1',
          title: 'Loaded title',
          description: 'Loaded description',
          geo_scope_id: '50',
          is_partner_not_applicable: 0,
          created_at: '2024-03-01T10:00:00.000Z',
          created_by_email: 'ada.lovelace@cgiar.org',
          created_by_first_name: 'Ada',
          created_by_last_name: 'Lovelace',
        },
      ],
    });

    await repository.loadByResultId(11);

    const headerSql = String(
      query.mock.calls.find((call) =>
        String(call[0]).includes('FROM results r'),
      )?.[0],
    );
    // Carnet is still preferred — it is the stable id. The fallback exists because
    // sec_users.carnet is NULL for 279/279 creators of Approved results on Dev,
    // which made every payload unbuildable via P-1.
    expect(headerSql).toMatch(
      /LEFT JOIN alliance_user_staff creator\s+ON\s+creator\.carnet\s*=\s*COALESCE\(\s*su\.carnet/,
    );
    // DC-1: alliance_user_staff holds duplicate emails and 199 blank ones, so the
    // fallback must exclude blanks and pick exactly ONE row, never multiply the header.
    expect(headerSql).toMatch(/a\.email\s*=\s*su\.email/);
    expect(headerSql).toMatch(/su\.email\s*<>\s*''/);
    expect(headerSql).toMatch(/ORDER BY a\.is_active DESC, a\.carnet ASC/);
    expect(headerSql).toMatch(/LIMIT 1/);
    // never the naive equi-join on email, which is what multiplies rows
    expect(headerSql).not.toMatch(
      /LEFT JOIN alliance_user_staff creator\s+ON\s+creator\.email\s*=/,
    );

    const submissionSql = String(
      query.mock.calls.find((call) =>
        String(call[0]).includes('FROM submission_history sh'),
      )?.[0],
    );
    expect(submissionSql).toMatch(
      /LEFT JOIN alliance_user_staff aus\s+ON\s+aus\.carnet\s*=\s*COALESCE\(\s*su\.carnet/,
    );
    expect(submissionSql).toMatch(/su\.email\s*<>\s*''/);
    expect(submissionSql).toMatch(/LIMIT 1/);
    expect(submissionSql).not.toMatch(
      /LEFT JOIN alliance_user_staff aus\s+ON\s+aus\.email\s*=/,
    );
  });

  it('maps submitted_by.submitted_date from submission_history.created_at and rejects custom_date because custom_date is a later-editable display date, not the approval event time', async () => {
    mockQueries({
      header: [
        {
          result_id: '11',
          result_official_code: '1441061',
          indicator_id: '1',
          title: 'Loaded title',
          description: 'Loaded description',
          geo_scope_id: '50',
          is_partner_not_applicable: 0,
          created_at: '2024-03-01T10:00:00.000Z',
          created_by_email: 'ada.lovelace@cgiar.org',
          created_by_first_name: 'Ada',
          created_by_last_name: 'Lovelace',
        },
      ],
      submission: [
        {
          created_at: '2025-06-15T14:30:00.000Z',
          submission_comment: 'Approved for PRMS sync',
          email: 'ada.lovelace@cgiar.org',
          first_name: 'Ada',
          last_name: 'Lovelace',
        },
      ],
    });

    const aggregate = await repository.loadByResultId(11);
    const submissionSql = String(
      query.mock.calls.find((call) =>
        String(call[0]).includes('FROM submission_history sh'),
      )?.[0],
    );

    expect(submissionSql).toContain('sh.created_at');
    expect(submissionSql).toMatch(/ORDER BY sh\.created_at DESC/);
    expect(submissionSql).not.toContain('custom_date');
    expect(aggregate?.submitted_by?.submitted_date).toEqual(
      new Date('2025-06-15T14:30:00.000Z'),
    );
  });

  it('filters implementing organizations with InstitutionRolesEnum.POLICY_CHANGE, not a literal', () => {
    const source = readFileSync(
      join(__dirname, 'result-prms-sync-aggregate.repository.ts'),
      'utf8',
    );
    expect(source).toContain('[resultId, InstitutionRolesEnum.POLICY_CHANGE]');
    expect(source).not.toMatch(/\[resultId,\s*4\s*\]/);
  });

  it('attaches POLICY_CHANGE implementing_organizations to the policy_change slice', async () => {
    mockQueries({
      header: [headerRow],
      policy: [{ result_id: 11, policy_type_id: 2 }],
      implementingOrgs: [
        {
          institution_id: '46',
          institution_role_id: String(InstitutionRolesEnum.POLICY_CHANGE),
          acronym: 'ABC RH - CIAT (Alliance)',
          name: 'Alliance of Bioversity and CIAT',
        },
      ],
      partners: [
        {
          institution_id: '12',
          acronym: 'FAO',
          name: 'Food and Agriculture Organization',
        },
      ],
    });

    const aggregate = await repository.loadByResultId(11);
    const implementingCall = query.mock.calls.find(
      (call) =>
        String(call[0]).includes('FROM result_institutions ri') &&
        !String(call[0]).includes('ci.code AS institution_id'),
    );

    expect(implementingCall?.[1]).toEqual([
      11,
      InstitutionRolesEnum.POLICY_CHANGE,
    ]);
    expect(aggregate?.type_slices?.policy_change).toEqual(
      expect.objectContaining({
        result_id: 11,
        policy_type_id: 2,
        implementing_organizations: [
          {
            institution_id: 46,
            institution_role_id: InstitutionRolesEnum.POLICY_CHANGE,
            acronym: 'ABC RH - CIAT (Alliance)',
            name: 'Alliance of Bioversity and CIAT',
          },
        ],
      }),
    );
  });

  it('attaches innovation_type { code, name } and innovation_readiness { id, name } to the innovation_dev slice', async () => {
    mockQueries({
      header: [headerRow],
      innovationDev: [
        {
          result_id: 11,
          innovation_type_id: 2,
          innovation_readiness_id: 3,
        },
      ],
      innovationType: [{ code: '2', name: 'Technological innovation' }],
      innovationReadiness: [{ id: '3', name: 'Piloted', level: 3 }],
    });

    const aggregate = await repository.loadByResultId(11);
    const typeSql = String(
      query.mock.calls.find((call) =>
        String(call[0]).includes('clarisa_innovation_types'),
      )?.[0],
    );
    const readinessSql = String(
      query.mock.calls.find((call) =>
        String(call[0]).includes('clarisa_innovation_readiness_levels'),
      )?.[0],
    );

    expect(typeSql).toMatch(/cit\.code\s*=\s*rid\.innovation_type_id/);
    expect(readinessSql).toMatch(/cirl\.id\s*=\s*rid\.innovation_readiness_id/);
    expect(readinessSql).not.toMatch(/cirl\.level/);
    expect(aggregate?.type_slices?.innovation_dev).toEqual(
      expect.objectContaining({
        result_id: 11,
        innovation_type: { code: 2, name: 'Technological innovation' },
        innovation_readiness: { id: 3, name: 'Piloted' },
      }),
    );
    expect(aggregate?.type_slices?.innovation_dev).not.toEqual(
      expect.objectContaining({
        innovation_readiness: expect.objectContaining({ level: 3 }),
      }),
    );
  });

  it('builds the payload aggregate from a version (snapshot) row — the header query does not constrain is_snapshot', async () => {
    // SP_versioning copies every result_* table this aggregate reads onto the
    // version, so the header is the only place that could refuse one.
    mockQueries({ header: [{ result_id: 555, result_official_code: 19949 }] });

    const aggregate = await repository.loadByResultId(555);

    const headerSql = query.mock.calls
      .map((call) => call[0] as string)
      .find((sql) => /FROM results r/.test(sql));
    expect(headerSql).toBeDefined();
    expect(headerSql).not.toMatch(/is_snapshot/i);
    expect(aggregate).not.toBeNull();
  });
});
