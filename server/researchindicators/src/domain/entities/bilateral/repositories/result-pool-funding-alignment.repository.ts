import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SelectedLeverResponse } from '../dto/update-pool-funding-alignment.dto';
import { SpRole } from '../dto/sp-role.type';
import { ResultPoolFundingAlignment } from '../entities/result-pool-funding-alignment.entity';

interface PoolFundingAlignmentRow {
  id: number | string;
  result_id: number | string;
  has_contribution: boolean | number | string;
  lever_code?: string;
  lever_name?: string;
  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-08 / design.md §4
  // Same underlying column as `lever_code` (`rpfas.sp_code`), selected a
  // second time under its own alias so the `sp_roles` projection reads by
  // its real name rather than piggybacking on the back-compat `lever_code`
  // alias. Rides the SAME LEFT JOIN — no second query (NFR-BIL-122).
  sp_code?: string | null;
  sp_role?: string | null;
}

// @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-08 / R-BIL-123, design.md §4
export interface PoolFundingAlignmentSpRole {
  sp_code: string;
  sp_role: SpRole | null;
}

export interface PoolFundingAlignmentDetail {
  id: number;
  result_id: number;
  has_contribution: boolean;
  selected_levers: SelectedLeverResponse[];
  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-08 / R-BIL-123, design.md §4
  // NOT `selected_sps` — that name is already a live TypeORM `@OneToMany`
  // relation on `ResultPoolFundingAlignment` (`result-pool-funding-alignment
  // .entity.ts`), with its inverse on `ResultPoolFundingAlignmentSp`.
  // Reusing it would invite `.find({ relations: ['selected_sps'] })` to
  // return full audited entity rows instead of this clean projection.
  sp_roles: PoolFundingAlignmentSpRole[];
}

@Injectable()
export class ResultPoolFundingAlignmentRepository extends Repository<ResultPoolFundingAlignment> {
  constructor(dataSource: DataSource) {
    super(ResultPoolFundingAlignment, dataSource.createEntityManager());
  }

  async findActiveAlignmentByResultId(
    resultId: number,
  ): Promise<PoolFundingAlignmentDetail | null> {
    // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.3 / R-BIL-073
    // Column on `result_pool_funding_alignment_sp` was renamed `lever_code`
    // → `sp_code`. The response field stays `lever_code` (API back-compat)
    // via the SQL alias below.
    const rows = (await this.query(
      `
      SELECT
        rpfa.id,
        rpfa.result_id,
        rpfa.has_contribution,
        rpfas.sp_code AS lever_code,
        COALESCE(cl.full_name, cl.short_name, rpfas.sp_code) AS lever_name,
        rpfas.sp_code AS sp_code,
        rpfas.sp_role AS sp_role
      FROM result_pool_funding_alignment rpfa
      LEFT JOIN result_pool_funding_alignment_sp rpfas
        ON rpfas.alignment_id = rpfa.id
        AND rpfas.is_active = TRUE
      LEFT JOIN clarisa_levers cl
        ON cl.short_name = rpfas.sp_code
        AND cl.is_active = TRUE
      WHERE rpfa.result_id = ?
        AND rpfa.is_active = TRUE
      ORDER BY rpfas.sp_code ASC;
      `,
      [resultId],
    )) as PoolFundingAlignmentRow[];

    if (!rows.length) {
      return null;
    }

    const [firstRow] = rows;

    return {
      id: Number(firstRow.id),
      result_id: Number(firstRow.result_id),
      has_contribution: this.toBoolean(firstRow.has_contribution),
      selected_levers: rows
        .filter((row) => Boolean(row.lever_code))
        .map((row) => ({
          lever_code: row.lever_code as string,
          lever_name: row.lever_name ?? (row.lever_code as string),
        })),
      // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-08 / R-BIL-123, design.md §4
      // Same LEFT JOIN null guard as `selected_levers` above (`Boolean(row
      // .lever_code)`): an alignment with zero active SP rows yields one row
      // with a NULL sp_code, which must NOT become a phantom
      // `{ sp_code: null }` member here.
      sp_roles: rows
        .filter((row) => Boolean(row.sp_code))
        .map((row) => ({
          sp_code: row.sp_code as string,
          sp_role: (row.sp_role ?? null) as SpRole | null,
        })),
    };
  }

  private toBoolean(value: boolean | number | string): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
  }
}
