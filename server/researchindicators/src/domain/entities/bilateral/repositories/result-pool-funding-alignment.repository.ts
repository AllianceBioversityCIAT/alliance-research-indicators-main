import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SelectedLeverResponse } from '../dto/update-pool-funding-alignment.dto';
import { ResultPoolFundingAlignment } from '../entities/result-pool-funding-alignment.entity';

interface PoolFundingAlignmentRow {
  id: number | string;
  result_id: number | string;
  has_contribution: boolean | number | string;
  lever_code?: string;
  lever_name?: string;
}

export interface PoolFundingAlignmentDetail {
  id: number;
  result_id: number;
  has_contribution: boolean;
  selected_levers: SelectedLeverResponse[];
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
        COALESCE(cl.full_name, cl.short_name, rpfas.sp_code) AS lever_name
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
    };
  }

  private toBoolean(value: boolean | number | string): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
  }
}
