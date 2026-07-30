// @akili-spec project-dashboard/indicator-metadata-charts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import {
  IndicatorMetadataSectionsDto,
  MetadataCountDto,
} from '../dto/reports-indicator-metadata.dto';
import { SessionFormatEnum } from '../../session-formats/enums/session-format.enum';
import { SessionLengthEnum } from '../../session-lengths/enum/session-lengths.enum';
import { SessionTypeEnum } from '../../session-types/enum/session-type.enum';
import { buildPrimaryContractResultsScopeSql } from '../utils/primary-contract-results.util';

/**
 * The 6 sections produced by Q1 (the simple-indicator union) — see
 * `getSimpleIndicatorSections()` below. Declared as a `Pick` of the full
 * 10-section contract (`reports-indicator-metadata.dto.ts`, landed by T-02)
 * so this repository's return shape stays structurally tied to that
 * contract without redeclaring it.
 */
export type SimpleIndicatorMetadataSections = Pick<
  IndicatorMetadataSectionsDto,
  | 'innovation_nature'
  | 'innovation_type'
  | 'innovation_readiness'
  | 'oicr_maturity'
  | 'policy_type'
  | 'policy_stage'
>;

/** The section discriminator emitted by each of Q1's 6 UNION branches. */
type SimpleIndicatorSectionKey = keyof SimpleIndicatorMetadataSections;

/**
 * Q2's output. Three of these are final payload sections, tied structurally to
 * the 10-section contract. The other two are **intermediate raw shapes**, not
 * payload fields: `gender_individual` and `gender_group` are what T-05's pure
 * `mergeGenderDistribution()` (`../utils/gender-distribution.util.ts`) combines
 * into the single `gender_distribution` section. This repository deliberately
 * does not merge them — T-06 owns wiring the util in — which is why they cannot
 * be `Pick`ed from the DTO: no such fields exist on the wire contract.
 */
export type CapacitySharingMetadataSections = Pick<
  IndicatorMetadataSectionsDto,
  'session_format' | 'session_type' | 'degree'
> & {
  gender_individual: MetadataCountDto[];
  gender_group: MetadataCountDto[];
};

/**
 * One row of a raw union result set, before grouping — uniform four-column
 * shape `(section VARCHAR, id BIGINT, name TEXT, count BIGINT)`
 * (design.md §6.1). The discriminator leads so rows bucket contiguously.
 */
interface MetadataSectionRow {
  section: string;
  id: number | string;
  name: string;
  count: number | string;
}

/**
 * Server-side repository for the 10 new Indicator-metadata aggregations on
 * `GET /api/v1/agresso/contracts/reports/full` (`requirements.md` R-IMC-001
 * … R-IMC-006; `design.md` §6).
 *
 * **Two queries, thirteen branches, ten sections** (DD-1). Consolidating the
 * ten aggregations into two queries is what keeps step 2 of the composition at
 * 2 concurrent connections, so peak concurrency for `reports/full` stays at
 * today's 8 against an un-configured pool whose mysql2 default limit is 10.
 * `getSimpleIndicatorSections()` is Q1 (T-03); `getCapacitySharingMetadata()`
 * is Q2 (T-04). Both were verified against the real schema before landing.
 *
 * This class exposes **no combining method** — composing Q1 + Q2 into the
 * payload, and awaiting them **sequentially rather than racing them** (DD-11,
 * the decision that removes this spec's infrastructure prerequisite), belongs
 * to `AgressoContractService` and is owned by T-06.
 */
@Injectable()
export class IndicatorMetadataReportsRepository {
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: IndicatorMetadataReportsRepository.name,
  });

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Q1 — the simple-indicator union (`design.md` §6.1, DD-1).
   *
   * One query: a CTE wrapping the shared primary-contract scoping rule
   * (`buildPrimaryContractResultsScopeSql`, `requirements.md` §4.2 — one copy
   * of that predicate exists, and both this repository and
   * `AgressoContractRepository` call it), then 6 `UNION ALL` branches over
   * `result_innovation_dev`, `result_oicrs` and `result_policy_change`,
   * producing `innovation_nature`, `innovation_type`, `innovation_readiness`,
   * `oicr_maturity`, `policy_type`, `policy_stage`.
   *
   * The CTE is load-bearing, not stylistic: it binds the contract id
   * **once per query**, which is what removes DC-12 (a misplaced positional
   * parameter binding a contract id into a lookup-id comparison, returning
   * zero rows instead of erroring) structurally rather than by convention.
   *
   * Every branch: inner-joins the CTE, filters the fact row
   * `is_active = TRUE` (all four fact entities extend `AuditableEntity`),
   * and inner-joins the lookup — which also excludes NULL metadata ids as a
   * side effect, satisfying R-IMC-001 AC.2 without a separate predicate.
   * `COUNT(*)` is safe because every fact table here is 1:1 with `results`
   * (`result_id` is the PK on each), so it cannot double-count (R-6).
   *
   * Join columns and label columns are **not uniform** and come from
   * `requirements.md` §4.1 as amended by T-01's executed recon — do not
   * assume `.id`:
   * - `clarisa_innovation_characteristics` → join `id`, label `name`
   * - `clarisa_innovation_types` → join **`code`** ⚠, label `name`
   * - `clarisa_innovation_readiness_levels` → join `id`, label
   *   `CONCAT(level,'. ',name)` (`id` is 11–20, `level` is 0–9 — `id ≠ level`)
   * - `maturity_levels` → join `id`, label `full_name` (`name` is only
   *   `"Level 1"`)
   * - `policy_types` → join `policy_type_id`, label `name`
   * - `policy_stage` (singular table) → join `policy_stage_id`, label
   *   **`description`** ⚠ (`name` is only `"Stage 1"`)
   *
   * Ordering is applied **once, to the union as a whole** —
   * `ORDER BY section, count DESC, id ASC` — never per branch: in MySQL
   * that is either a syntax error or not guaranteed to survive the union,
   * and ordering is a hard acceptance criterion (R-IMC-001).
   */
  async getSimpleIndicatorSections(
    contractId: string,
  ): Promise<SimpleIndicatorMetadataSections> {
    const startedAt = Date.now();

    const sql = `
      WITH contract_results AS (
        ${buildPrimaryContractResultsScopeSql()}
      )
      SELECT 'innovation_nature' AS section, l.id AS id, l.name AS name, COUNT(*) AS count
      FROM result_innovation_dev f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      INNER JOIN clarisa_innovation_characteristics l ON l.id = f.innovation_nature_id
      WHERE f.is_active = TRUE
      GROUP BY l.id, l.name

      UNION ALL

      SELECT 'innovation_type' AS section, l.code AS id, l.name AS name, COUNT(*) AS count
      FROM result_innovation_dev f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      INNER JOIN clarisa_innovation_types l ON l.code = f.innovation_type_id
      WHERE f.is_active = TRUE
      GROUP BY l.code, l.name

      UNION ALL

      SELECT 'innovation_readiness' AS section, l.id AS id, CONCAT(l.level, '. ', l.name) AS name, COUNT(*) AS count
      FROM result_innovation_dev f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      INNER JOIN clarisa_innovation_readiness_levels l ON l.id = f.innovation_readiness_id
      WHERE f.is_active = TRUE
      GROUP BY l.id, l.level, l.name

      UNION ALL

      SELECT 'oicr_maturity' AS section, l.id AS id, l.full_name AS name, COUNT(*) AS count
      FROM result_oicrs f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      INNER JOIN maturity_levels l ON l.id = f.maturity_level_id
      WHERE f.is_active = TRUE
      GROUP BY l.id, l.full_name

      UNION ALL

      SELECT 'policy_type' AS section, l.policy_type_id AS id, l.name AS name, COUNT(*) AS count
      FROM result_policy_change f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      INNER JOIN policy_types l ON l.policy_type_id = f.policy_type_id
      WHERE f.is_active = TRUE
      GROUP BY l.policy_type_id, l.name

      UNION ALL

      SELECT 'policy_stage' AS section, l.policy_stage_id AS id, l.description AS name, COUNT(*) AS count
      FROM result_policy_change f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      INNER JOIN policy_stage l ON l.policy_stage_id = f.policy_stage_id
      WHERE f.is_active = TRUE
      GROUP BY l.policy_stage_id, l.description

      ORDER BY section, count DESC, id ASC
    `;

    const rows = (await this.dataSource.query(sql, [
      contractId,
    ])) as MetadataSectionRow[];

    const sections: SimpleIndicatorMetadataSections = {
      innovation_nature: [],
      innovation_type: [],
      innovation_readiness: [],
      oicr_maturity: [],
      policy_type: [],
      policy_stage: [],
    };

    for (const row of rows) {
      const bucket = sections[row.section as SimpleIndicatorSectionKey];
      if (!bucket) {
        continue;
      }
      bucket.push(this.toEntry(row));
    }

    this.logger._debug(
      `Q1 simple-indicator union — contract_id=${contractId} elapsedMs=${Date.now() - startedAt} totalRows=${rows.length} bySection=${JSON.stringify(
        this.rowCountsBySection(sections),
      )}`,
    );

    return sections;
  }

  /**
   * Q2 — the capacity-sharing union (7 branches → 4 sections; `design.md`
   * §6.1, §6.2, §6.3).
   *
   * One CTE wraps the same shared scoping rule as Q1 so the contract id binds
   * **once** for the whole query rather than once per branch (DD-1; the
   * structural fix for DC-12's silent zero-rows hazard).
   *
   * Branches (uniform `(section, id, name, count)` shape, discriminator first):
   *  1. `session_format`    — grouped by `session_format_id`, joined to `session_formats`.
   *  2. `session_type`      — grouped by `session_type_id`, joined to `session_types`.
   *  3. `degree`            — R-IMC-006: the two-condition conjunction
   *                           `session_type_id = TRAINING AND session_length_id = LONG_TERM`,
   *                           joined to `degrees`. Deliberately **NOT**
   *                           `degree_id IS NOT NULL` — the form clears the field via
   *                           `clearDegreeIdIfNotLongTerm`, but historical rows switched
   *                           away from long-term retain a **stale** `degree_id`.
   *                           Measured live: the loose filter matches **54** rows, the
   *                           conjunction **36** — an 18-row over-count
   *                           (`execution.md` § T-01). Training is resolved **by id**
   *                           (seed migration `1727119632564`), never by `name`, because
   *                           `session_types.name` is `TEXT` and a label edit would
   *                           silently empty this chart with no error.
   *  4. `gender_individual` — individual-format rows grouped by `gender_id`, joined to
   *                           `gender` (singular table, join column **`gender_id`** —
   *                           `gender.id` does not exist).
   *  5-7. `gender_group`    — group participation is three fixed **columns**, not rows,
   *                           so it cannot be grouped like the others. Emitted as three
   *                           explicit literal branches carrying the seeded id **and**
   *                           name as literals (Male=1, Female=2, Non-binary=3), each
   *                           `COALESCE(SUM(...), 0)` so a NULL participant column reads
   *                           as 0 participants rather than a missing category
   *                           (R-IMC-005 AC.2). These branches carry **no `GROUP BY` by
   *                           design**: a bare aggregate always yields exactly one row,
   *                           which is what guarantees all three categories appear even
   *                           for a contract with zero group-format rows.
   *
   * `gender_individual` / `gender_group` are **not merged or re-sorted here.**
   * T-05's pure `mergeGenderDistribution()` owns the symmetric sum over the union of
   * `gender_id`s and the post-sum re-sort (`count DESC, id ASC`) — because summing
   * reorders the ranking and the union-level `ORDER BY` below cannot reach across
   * that arithmetic (R-IMC-005 AC.7).
   */
  async getCapacitySharingMetadata(
    contractId: string,
  ): Promise<CapacitySharingMetadataSections> {
    const startedAt = Date.now();

    const sql = `
      WITH contract_results AS (
        ${buildPrimaryContractResultsScopeSql()}
      )
      SELECT 'session_format' AS section,
             l.session_format_id AS id,
             l.name AS name,
             COUNT(*) AS count
      FROM result_capacity_sharing f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      INNER JOIN session_formats l ON l.session_format_id = f.session_format_id
      WHERE f.is_active = TRUE
      GROUP BY l.session_format_id, l.name

      UNION ALL

      SELECT 'session_type' AS section,
             l.session_type_id AS id,
             l.name AS name,
             COUNT(*) AS count
      FROM result_capacity_sharing f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      INNER JOIN session_types l ON l.session_type_id = f.session_type_id
      WHERE f.is_active = TRUE
      GROUP BY l.session_type_id, l.name

      UNION ALL

      SELECT 'degree' AS section,
             l.degree_id AS id,
             l.name AS name,
             COUNT(*) AS count
      FROM result_capacity_sharing f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      INNER JOIN degrees l ON l.degree_id = f.degree_id
      WHERE f.is_active = TRUE
        AND f.session_type_id = ?
        AND f.session_length_id = ?
      GROUP BY l.degree_id, l.name

      UNION ALL

      SELECT 'gender_individual' AS section,
             l.gender_id AS id,
             l.name AS name,
             COUNT(*) AS count
      FROM result_capacity_sharing f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      INNER JOIN gender l ON l.gender_id = f.gender_id
      WHERE f.is_active = TRUE
        AND f.session_format_id = ?
      GROUP BY l.gender_id, l.name

      UNION ALL

      SELECT 'gender_group' AS section,
             1 AS id,
             'Male' AS name,
             COALESCE(SUM(f.session_participants_male), 0) AS count
      FROM result_capacity_sharing f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      WHERE f.is_active = TRUE
        AND f.session_format_id = ?

      UNION ALL

      SELECT 'gender_group' AS section,
             2 AS id,
             'Female' AS name,
             COALESCE(SUM(f.session_participants_female), 0) AS count
      FROM result_capacity_sharing f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      WHERE f.is_active = TRUE
        AND f.session_format_id = ?

      UNION ALL

      SELECT 'gender_group' AS section,
             3 AS id,
             'Non-binary' AS name,
             COALESCE(SUM(f.session_participants_non_binary), 0) AS count
      FROM result_capacity_sharing f
      INNER JOIN contract_results cr ON cr.result_id = f.result_id
      WHERE f.is_active = TRUE
        AND f.session_format_id = ?

      ORDER BY section, count DESC, id ASC
    `;

    const params = [
      contractId,
      SessionTypeEnum.TRAINING,
      SessionLengthEnum.LONG_TERM,
      SessionFormatEnum.INDIVIDUAL,
      SessionFormatEnum.GROUP,
      SessionFormatEnum.GROUP,
      SessionFormatEnum.GROUP,
    ];

    const rows = (await this.dataSource.query(
      sql,
      params,
    )) as MetadataSectionRow[];

    const sections: CapacitySharingMetadataSections = {
      session_format: [],
      session_type: [],
      degree: [],
      gender_individual: [],
      gender_group: [],
    };

    for (const row of rows) {
      const bucket =
        sections[row.section as keyof CapacitySharingMetadataSections];
      if (!bucket) {
        continue;
      }
      bucket.push(this.toEntry(row));
    }

    this.logger._debug(
      `Q2 capacity-sharing union — contract_id=${contractId} elapsedMs=${Date.now() - startedAt} totalRows=${rows.length} bySection=${JSON.stringify(
        this.rowCountsBySection(sections),
      )}`,
    );

    return sections;
  }

  /**
   * Normalises one raw union row into a payload entry. MySQL returns `BIGINT`
   * as a string through mysql2, so `id` and `count` are coerced explicitly —
   * without this, `count` would reach the client as `"13"` and any arithmetic
   * or sort downstream would be lexicographic.
   */
  private toEntry(row: MetadataSectionRow): MetadataCountDto {
    return {
      id: Number(row.id),
      name: row.name,
      count: Number(row.count),
    };
  }

  /** Per-section row counts for the debug log line (design §9). */
  private rowCountsBySection(
    sections: Record<string, MetadataCountDto[]>,
  ): Record<string, number> {
    return Object.fromEntries(
      Object.entries(sections).map(([section, entries]) => [
        section,
        entries.length,
      ]),
    );
  }
}
