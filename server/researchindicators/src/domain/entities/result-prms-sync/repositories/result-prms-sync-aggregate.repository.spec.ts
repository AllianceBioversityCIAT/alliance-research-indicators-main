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
      if (sql.includes('FROM result_institutions ri')) {
        return overrides.partners ?? [];
      }
      if (sql.includes('FROM result_evidences re')) {
        return overrides.evidence ?? [];
      }
      if (sql.includes('FROM result_capacity_sharing')) {
        return overrides.capacity ?? [];
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

  it('pins the creator and submitted_by staff joins to alliance_user_staff.carnet = sec_users.carnet, not email (homologation.md §4; carnet is stable, email is mutable DC-1)', async () => {
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
    expect(headerSql).toMatch(
      /LEFT JOIN alliance_user_staff creator\s+ON\s+creator\.carnet\s*=\s*su\.carnet/,
    );
    expect(headerSql).not.toMatch(
      /LEFT JOIN alliance_user_staff creator\s+ON\s+LOWER\(TRIM\(creator\.email\)\)/,
    );

    const submissionSql = String(
      query.mock.calls.find((call) =>
        String(call[0]).includes('FROM submission_history sh'),
      )?.[0],
    );
    expect(submissionSql).toMatch(
      /LEFT JOIN alliance_user_staff aus\s+ON\s+aus\.carnet\s*=\s*su\.carnet/,
    );
    expect(submissionSql).not.toMatch(
      /LEFT JOIN alliance_user_staff aus\s+ON\s+LOWER\(TRIM\(aus\.email\)\)/,
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
});
