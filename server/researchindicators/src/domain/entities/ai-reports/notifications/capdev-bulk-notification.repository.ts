import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BulkUploadProcesses } from '../entities/bulk-upload-processes.entity';
import { BulkUploadResults } from '../entities/bulk-upload-results.entity';
import { ResultContract } from '../../result-contracts/entities/result-contract.entity';
import { AgressoContract } from '../../agresso-contract/entities/agresso-contract.entity';
import { AllianceUserStaff } from '../../alliance-user-staff/entities/alliance-user-staff.entity';
import { ResultCapacitySharing } from '../../result-capacity-sharing/entities/result-capacity-sharing.entity';
import { ResultCountry } from '../../result-countries/entities/result-country.entity';
import { ClarisaCountry } from '../../../tools/clarisa/entities/clarisa-countries/entities/clarisa-country.entity';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { NotificationStatus } from './enum/notification-status.enum';
import {
  CapdevBulkCountriesDto,
  CapdevBulkCountriesRawRow,
  CapdevBulkGroupDto,
  CapdevBulkGroupRawRow,
  CapdevBulkGroupsMapResult,
  CapdevBulkMetricsDto,
  CapdevBulkMetricsRawRow,
  CapdevBulkProcessMetricsInput,
  CapdevBulkStaffPersonDto,
  CapdevBulkTokenOwnerDto,
  CapdevMultiPrimaryWarningDto,
} from './dto/capdev-bulk-group.dto';

/**
 * Join condition that resolves the *single* active primary contract for a
 * `bulk_upload_results` row, even though nothing in the schema (or any write
 * path) constrains a result to exactly one `is_primary = true AND is_active
 * = true` row. Ties break on the lowest `result_contract_id` — design.md
 * §6.1 (JD-03).
 */
const ACTIVE_PRIMARY_CONTRACT_JOIN =
  'rc.result_id = bur.result_id ' +
  'AND rc.is_primary = :isPrimary AND rc.is_active = :isActive ' +
  'AND rc.result_contract_id = (' +
  'SELECT MIN(rc2.result_contract_id) FROM result_contracts rc2 ' +
  'WHERE rc2.result_id = bur.result_id ' +
  'AND rc2.is_primary = :isPrimary AND rc2.is_active = :isActive' +
  ')';

/**
 * Per-group, comma-separated list of `result_id`s that had more than one
 * active primary contract — the tie-break above silently picks a winner;
 * this is what lets the service log a warning naming each affected result
 * (R-CBU-002 AC.3 / design.md §10).
 */
const MULTI_PRIMARY_RESULT_IDS_SELECT =
  'GROUP_CONCAT(DISTINCT CASE WHEN (' +
  'SELECT COUNT(*) FROM result_contracts rc_dup ' +
  'WHERE rc_dup.result_id = bur.result_id ' +
  'AND rc_dup.is_primary = TRUE AND rc_dup.is_active = TRUE' +
  ') > 1 THEN bur.result_id END)';

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toNumber(value: unknown): number {
  return toNullableNumber(value) ?? 0;
}

function toNullableDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function splitCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function mapStaffPerson(
  carnet: string | null,
  firstName: string | null,
  lastName: string | null,
  email: string | null,
): CapdevBulkStaffPersonDto | null {
  if (!carnet) return null;
  return {
    carnet,
    first_name: firstName ?? null,
    last_name: lastName ?? null,
    email: email ?? null,
  };
}

function mapTokenOwner(
  secUserId: string | number | null,
  firstName: string | null,
  lastName: string | null,
  email: string | null,
): CapdevBulkTokenOwnerDto | null {
  const parsedId = toNullableNumber(secUserId);
  if (parsedId === null) return null;
  return {
    sec_user_id: parsedId,
    first_name: firstName ?? null,
    last_name: lastName ?? null,
    email: email ?? null,
  };
}

/**
 * Maps Q1's raw rows to `{ groups, multiPrimaryWarnings }`.
 *
 * Exported as a pure function so the grouping + tie-break rule is testable
 * with plain fixtures, with no database involved (see the "no live DB"
 * constraint in this task's testing strategy). It defensively collapses by
 * `agreement_id` — a no-op against Q1's real, already-`GROUP BY`-ed SQL
 * output, and the actual, provable safeguard against a regression that
 * drops that `GROUP BY` (the defect this task exists to prevent: N results
 * in one contract producing N emails instead of one).
 */
export function mapCapdevBulkGroupRows(
  rawRows: CapdevBulkGroupRawRow[],
): CapdevBulkGroupsMapResult {
  const groupsByAgreementId = new Map<string, CapdevBulkGroupDto>();
  const multiPrimaryWarnings: CapdevMultiPrimaryWarningDto[] = [];

  for (const row of rawRows ?? []) {
    if (!row?.agreement_id) continue;

    if (!groupsByAgreementId.has(row.agreement_id)) {
      groupsByAgreementId.set(row.agreement_id, {
        agreement_id: row.agreement_id,
        project_lead_description: row.project_lead_description ?? null,
        pi: mapStaffPerson(
          row.pi_carnet,
          row.pi_first_name,
          row.pi_last_name,
          row.pi_email,
        ),
        ra: mapStaffPerson(
          row.ra_carnet,
          row.ra_first_name,
          row.ra_last_name,
          row.ra_email,
        ),
        pa: mapStaffPerson(
          row.pa_carnet,
          row.pa_first_name,
          row.pa_last_name,
          row.pa_email,
        ),
        token_owner: mapTokenOwner(
          row.token_owner_id,
          row.token_owner_first_name,
          row.token_owner_last_name,
          row.token_owner_email,
        ),
      });
    }

    for (const resultIdText of splitCsv(row.multi_primary_result_ids)) {
      const resultId = toNullableNumber(resultIdText);
      if (resultId === null) continue;
      multiPrimaryWarnings.push({
        result_id: resultId,
        agreement_id: row.agreement_id,
      });
    }
  }

  return {
    groups: Array.from(groupsByAgreementId.values()),
    multiPrimaryWarnings,
  };
}

/** Maps one Q2 raw row (numeric strings from the MySQL driver) to `CapdevBulkMetricsDto`. */
export function mapCapdevBulkMetricsRow(
  row: CapdevBulkMetricsRawRow,
): CapdevBulkMetricsDto {
  return {
    agreement_id: row.agreement_id,
    trainings_count: toNumber(row.trainings_count),
    participants_total: toNumber(row.participants_total),
    female_participants_total: toNumber(row.female_participants_total),
    start_date: toNullableDate(row.start_date),
    end_date: toNullableDate(row.end_date),
  };
}

/** Maps one Q3 raw row (two `GROUP_CONCAT` strings) to `CapdevBulkCountriesDto`. */
export function mapCapdevBulkCountriesRow(
  row: CapdevBulkCountriesRawRow,
): CapdevBulkCountriesDto {
  return {
    agreement_id: row.agreement_id,
    country_names: splitCsv(row.country_names),
    iso_alpha2_list: splitCsv(row.iso_alpha2_list),
  };
}

/**
 * Four grouped reads + one ungrouped scalar read + two writes for the
 * CapDev bulk-upload notification stage (design.md §6.1). The four grouped
 * reads are keyed on `bulk_upload_process_id` and grouped in SQL — O(groups)
 * query count, never O(results) (NFR-CBU-001). The scalar read
 * (`countTotalResults`) is the one column in §4.1 that is neither
 * indicator- nor contract-filtered, so it has no join and no `GROUP BY` at
 * all — a single `COUNT(*)`, still O(1).
 */
@Injectable()
export class CapdevBulkNotificationRepository extends Repository<BulkUploadProcesses> {
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: CapdevBulkNotificationRepository.name,
  });

  constructor(private readonly dataSource: DataSource) {
    super(BulkUploadProcesses, dataSource.createEntityManager());
  }

  /**
   * The shared join spine: created, non-errored, CapDev results of the
   * batch, joined to their (tie-broken) active primary contract. The
   * CapDev filter is bound from `IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT`
   * — never a literal `1` — because a colliding enum member elsewhere in the
   * codebase uses the same name for a different value.
   */
  private capdevSpineQuery(processId: number) {
    return this.dataSource
      .getRepository(BulkUploadResults)
      .createQueryBuilder('bur')
      .innerJoin(ResultContract, 'rc', ACTIVE_PRIMARY_CONTRACT_JOIN, {
        isPrimary: true,
        isActive: true,
      })
      .innerJoin(AgressoContract, 'ac', 'ac.agreement_id = rc.contract_id')
      .where('bur.bulk_upload_process_id = :processId', { processId })
      .andWhere('bur.result_id IS NOT NULL')
      .andWhere('bur.error_message IS NULL')
      .andWhere('bur.indicator_id = :capdevIndicator', {
        capdevIndicator: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      });
  }

  /**
   * Q1 — groups + people + token owner.
   *
   * `GROUP BY ac.agreement_id` is mandatory: without it the spine returns
   * one row per bulk-upload row, not per contract, and an N-result project
   * would produce N emails (R-CBU-002 AC.1). PI/RA/PA columns are selected
   * via `MAX()` so the grouping stays valid under `ONLY_FULL_GROUP_BY`. The
   * token owner (`bulk_upload_processes.created_by` → `sec_users`) is
   * process-level and constant across groups, so it costs no extra read.
   */
  async findGroups(processId: number): Promise<CapdevBulkGroupsMapResult> {
    const rawRows = await this.capdevSpineQuery(processId)
      .leftJoin(AllianceUserStaff, 'pi', 'pi.carnet = ac.projectLeadId')
      .leftJoin(AllianceUserStaff, 'ra', 'ra.carnet = ac.researchAssistantId')
      .leftJoin(AllianceUserStaff, 'pa', 'pa.carnet = ac.programAssistantId')
      .innerJoin(
        BulkUploadProcesses,
        'bup',
        'bup.id = bur.bulk_upload_process_id',
      )
      .leftJoin('sec_users', 'su', 'su.sec_user_id = bup.created_by')
      .select('ac.agreement_id', 'agreement_id')
      .addSelect('MAX(ac.project_lead_description)', 'project_lead_description')
      .addSelect('MAX(pi.carnet)', 'pi_carnet')
      .addSelect('MAX(pi.first_name)', 'pi_first_name')
      .addSelect('MAX(pi.last_name)', 'pi_last_name')
      .addSelect('MAX(pi.email)', 'pi_email')
      .addSelect('MAX(ra.carnet)', 'ra_carnet')
      .addSelect('MAX(ra.first_name)', 'ra_first_name')
      .addSelect('MAX(ra.last_name)', 'ra_last_name')
      .addSelect('MAX(ra.email)', 'ra_email')
      .addSelect('MAX(pa.carnet)', 'pa_carnet')
      .addSelect('MAX(pa.first_name)', 'pa_first_name')
      .addSelect('MAX(pa.last_name)', 'pa_last_name')
      .addSelect('MAX(pa.email)', 'pa_email')
      .addSelect('MAX(su.sec_user_id)', 'token_owner_id')
      .addSelect('MAX(su.first_name)', 'token_owner_first_name')
      .addSelect('MAX(su.last_name)', 'token_owner_last_name')
      .addSelect('MAX(su.email)', 'token_owner_email')
      .addSelect(MULTI_PRIMARY_RESULT_IDS_SELECT, 'multi_primary_result_ids')
      .groupBy('ac.agreement_id')
      .getRawMany<CapdevBulkGroupRawRow>();

    const mapped = mapCapdevBulkGroupRows(rawRows);

    for (const warning of mapped.multiPrimaryWarnings) {
      this.logger._warn(
        `Multiple active primary contracts for result_id=${warning.result_id}; ` +
          `lowest result_contract_id chosen for agreement_id=${warning.agreement_id} ` +
          `(bulk_upload_process_id=${processId})`,
      );
    }

    return mapped;
  }

  /**
   * Q2 — metrics. Same spine + tie-break, joined to `result_capacity_sharing`,
   * `GROUP BY ac.agreement_id`. Participants fall back to
   * `male + female + non_binary` per row when `session_participants_total`
   * is null (R-CBU-006 AC.3); `SUM` ignores nulls so a group with no capacity
   * data at all correctly totals `0`.
   *
   * **`rcs.is_active = TRUE` is mandatory on the join**, matching Q3's
   * `result_countries` join in this same file and every other reader of
   * `result_capacity_sharing` on the platform. `ResultCapacitySharing`
   * extends `AuditableEntity` and is `@ManyToOne` to `Result`, so a result
   * can carry more than one row; an unfiltered join lets a soft-deleted row
   * inflate the SUMs and widen the MIN/MAX date bounds — numbers that get
   * persisted to `bulk_upload_processes` and mailed to a Project Leader.
   * `trainings_count` needs no such guard: it counts distinct
   * `bulk_upload_results` rows, not `result_capacity_sharing` rows.
   */
  async findMetrics(processId: number): Promise<CapdevBulkMetricsDto[]> {
    const rawRows = await this.capdevSpineQuery(processId)
      .leftJoin(
        ResultCapacitySharing,
        'rcs',
        'rcs.result_id = bur.result_id AND rcs.is_active = TRUE',
      )
      .select('ac.agreement_id', 'agreement_id')
      .addSelect('COUNT(DISTINCT bur.id)', 'trainings_count')
      .addSelect(
        'SUM(COALESCE(rcs.session_participants_total, ' +
          'COALESCE(rcs.session_participants_male, 0) + ' +
          'COALESCE(rcs.session_participants_female, 0) + ' +
          'COALESCE(rcs.session_participants_non_binary, 0)))',
        'participants_total',
      )
      .addSelect(
        'SUM(COALESCE(rcs.session_participants_female, 0))',
        'female_participants_total',
      )
      .addSelect('MIN(rcs.start_date)', 'start_date')
      .addSelect('MAX(rcs.end_date)', 'end_date')
      .groupBy('ac.agreement_id')
      .getRawMany<CapdevBulkMetricsRawRow>();

    return rawRows.map(mapCapdevBulkMetricsRow);
  }

  /**
   * Q3 — countries. Same spine, joined to `result_countries` →
   * `clarisa_countries`, `GROUP BY ac.agreement_id`, selecting **both**
   * `GROUP_CONCAT` of the CLARISA `name` (email body) and of `isoAlpha2`
   * (the `countries` JSON column) — the two are different values.
   */
  async findCountries(processId: number): Promise<CapdevBulkCountriesDto[]> {
    const rawRows = await this.capdevSpineQuery(processId)
      .leftJoin(
        ResultCountry,
        'rcty',
        'rcty.result_id = bur.result_id AND rcty.is_active = TRUE',
      )
      .leftJoin(ClarisaCountry, 'cc', 'cc.isoAlpha2 = rcty.isoAlpha2')
      .select('ac.agreement_id', 'agreement_id')
      .addSelect(
        'GROUP_CONCAT(DISTINCT cc.name ORDER BY cc.name)',
        'country_names',
      )
      .addSelect('GROUP_CONCAT(DISTINCT rcty.isoAlpha2)', 'iso_alpha2_list')
      .groupBy('ac.agreement_id')
      .getRawMany<CapdevBulkCountriesRawRow>();

    return rawRows.map(mapCapdevBulkCountriesRow);
  }

  /**
   * Q4 — unattributed results. Created, non-errored, CapDev results that
   * fall out of the inner join above because they have no active primary
   * contract at all. Selects the `result_id`s themselves (never a
   * `COUNT(*)`) so the caller's warn log can name each one (R-CBU-002 AC.3).
   * Still one query regardless of batch size.
   */
  async findUnattributedResultIds(processId: number): Promise<number[]> {
    const rows = await this.dataSource
      .getRepository(BulkUploadResults)
      .createQueryBuilder('bur')
      .leftJoin(
        ResultContract,
        'rc',
        'rc.result_id = bur.result_id AND rc.is_primary = :isPrimary AND rc.is_active = :isActive',
        { isPrimary: true, isActive: true },
      )
      .where('bur.bulk_upload_process_id = :processId', { processId })
      .andWhere('bur.result_id IS NOT NULL')
      .andWhere('bur.error_message IS NULL')
      .andWhere('bur.indicator_id = :capdevIndicator', {
        capdevIndicator: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      })
      .andWhere('rc.result_contract_id IS NULL')
      .select('bur.result_id', 'result_id')
      .getRawMany<{ result_id: number | string }>();

    return rows.map((row) => toNumber(row.result_id));
  }

  /**
   * Batch-wide total of created results — §4.1's `total_results`, the only
   * column in that table that is filtered **neither** by indicator **nor**
   * by contract (every other read in this file descends from
   * `capdevSpineQuery`, which hard-filters to
   * `IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT`). "Created" is
   * `requirements.md`'s glossary definition: `result_id IS NOT NULL AND
   * error_message IS NULL`. One unjoined scalar read, no `GROUP BY`, no
   * fan-out — NFR-CBU-001's O(groups)/≤2s targets are unaffected.
   */
  async countTotalResults(processId: number): Promise<number> {
    const row = await this.dataSource
      .getRepository(BulkUploadResults)
      .createQueryBuilder('bur')
      .where('bur.bulk_upload_process_id = :processId', { processId })
      .andWhere('bur.result_id IS NOT NULL')
      .andWhere('bur.error_message IS NULL')
      .select('COUNT(*)', 'count')
      .getRawOne<{ count: string | number }>();

    return toNumber(row?.count);
  }

  /**
   * Persists the batch-level aggregates on the process row (§4.1). Called
   * from the values the email itself is built from, so the two can never
   * disagree (R-CBU-008 AC.6).
   */
  async persistProcessMetrics(
    processId: number,
    metrics: CapdevBulkProcessMetricsInput,
  ): Promise<void> {
    await this.update(processId, { ...metrics });
  }

  /** Records the dispatch outcome (`SENT|SKIPPED|FAILED|PARTIAL`) and when it happened. */
  async updateNotificationStatus(
    processId: number,
    status: NotificationStatus,
    sentAt: Date | null,
  ): Promise<void> {
    await this.update(processId, {
      notification_status: status,
      notification_sent_at: sentAt,
    });
  }
}
