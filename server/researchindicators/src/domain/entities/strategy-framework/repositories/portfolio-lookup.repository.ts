import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';

/** Columns the read service is allowed to see (design 2.1, D-STF-11). */
export interface PortfolioLookupRow {
  id: number | string;
  name: string;
  start_year: number;
  end_year: number;
  is_active: number | boolean;
}

/**
 * Read-only portfolio projection. Not `PortfoliosService`: that service is
 * request-scoped through `CurrentUserUtil` (P-21, D-STF-11). This repository
 * takes only a `DataSource`.
 */
@Injectable()
export class PortfolioLookupRepository extends Repository<Portfolio> {
  constructor(dataSource: DataSource) {
    super(Portfolio, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<PortfolioLookupRow | null> {
    const rows: PortfolioLookupRow[] = await this.query(
      `SELECT id, name, start_year, end_year, is_active
         FROM portfolios
        WHERE id = ?`,
      [id],
    );
    return rows[0] ?? null;
  }

  /**
   * Every portfolio row, including inactive ones. No `deleted_at` column:
   * the projection does not have it (T-03). The read service decides which
   * rows are active for context (design 5.1).
   */
  async findAll(): Promise<PortfolioLookupRow[]> {
    return this.query(
      `SELECT id, name, start_year, end_year, is_active
         FROM portfolios`,
    );
  }
}
