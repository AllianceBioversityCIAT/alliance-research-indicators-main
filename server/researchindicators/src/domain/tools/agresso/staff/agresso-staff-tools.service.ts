import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { AgressoToolsHttp } from './agresso-tools.connection.http';
import { BaseControlListSave } from '../../../shared/global-dto/base-control-list-save';
import { ResponseAgressoStaffDto } from './dto/response-agresso-staff.dto';
import { AgressoStaffRawDto } from './dto/agresso-staff-raw.dto';
import { AllianceUserStaff } from '../../../entities/alliance-user-staff/entities/alliance-user-staff.entity';
import { allianceStaffMapper } from '../mappers/alliance-staff.mapper';
import { SecUserReconcilerService } from './sec-user-reconciler.service';
import { FetchReport } from './dto/fetch-report.dto';

/** Agresso's page size for the employees endpoint. */
const PAGE_SIZE = 1000;

@Injectable()
export class AgressoStaffToolsService extends BaseControlListSave<AgressoToolsHttp> {
  constructor(
    dataSource: DataSource,
    http: HttpService,
    private readonly reconciler: SecUserReconcilerService,
  ) {
    super(
      dataSource,
      new AgressoToolsHttp(http),
      new Logger(AgressoStaffToolsService.name),
    );
  }

  private query(pages: number, size: number) {
    return `ErpEmploymentServices/api/v1/employees?page=${pages}&pageSize=${size}&status=active`;
  }

  // @akili-spec changes/agresso-staff-deactivation (T-02, DD-D2)
  //
  // Was `Math.round(total / 1000) + (total % 1000 !== 0 ? 1 : 0)`, which OVERCOUNTS by one whenever
  // `total % 1000 >= 500`, because `Math.round` rounds the half up and the remainder term then adds
  // another page on top: 500 -> 2 (needs 1), 1500 -> 3 (needs 2), 2500 -> 4 (needs 3). That is
  // roughly half of all possible totals, and the surplus page always returns zero rows.
  //
  // Harmless while nothing read the page counts — `base()` mapped an empty array and wrote nothing.
  // Fatal to C-2, which aborts on a page that contributed no rows: over the old arithmetic that
  // guard would have fired on about half of all healthy runs.
  //
  // `ceil(n) <= round(n) + 1` for every `n >= 0`, so this never requests FEWER pages than are
  // needed — a property of the arithmetic, not of the data.
  private async findNumberOfPages(): Promise<{
    pages: number;
    totalElements: number;
  }> {
    const totalElements = await this.connection
      .getRaw<ResponseAgressoStaffDto<unknown>>(this.query(1, 1))
      .then(({ totalElements }) => Number(totalElements));
    return { pages: Math.ceil(totalElements / PAGE_SIZE), totalElements };
  }

  /** Distinct non-empty carnets across the payload — C-2's measure. See FetchReport. */
  private countDistinctCarnets(allStaff: AgressoStaffRawDto[]): number {
    const carnets = new Set<string>();
    for (const member of allStaff) {
      const carnet = member?.resourceId?.trim();
      if (carnet) {
        carnets.add(carnet);
      }
    }
    return carnets.size;
  }

  // @akili-spec changes/agresso-staff-sec-users-sync (T-07 — accumulate pages, reconcile once)
  async cloneAllAgressoStaff() {
    const { pages, totalElements } = await this.findNumberOfPages();
    this._logger.log(`Total pages: ${pages} (totalElements: ${totalElements})`);

    // Accumulated by capturing each raw payload member as `base()` maps it. The mapper runs once
    // per item, in payload order, so `allStaff` preserves page order then row order within the
    // page — which is exactly what DD-14's FIRST-ARRIVAL collapse rule is defined against (N-2).
    // Reading `base()`'s returned entities instead would make the collapse winner depend on
    // whatever order TypeORM's `save()` happens to return, which nothing guarantees.
    const allStaff: AgressoStaffRawDto[] = [];

    // Per-page contribution, measured as the delta in `allStaff` rather than inferred from what
    // `base()` returns — `base()` reports saved entities, which is not the same count and is not
    // the count C-2 needs.
    const pageRowCounts: number[] = [];

    for (let i = 1; i <= pages; i++) {
      this._logger.log(`Processing page: ${i} of ${pages}`);
      const before = allStaff.length;
      await this.base<AgressoStaffRawDto, AllianceUserStaff>(
        this.query(i, PAGE_SIZE),
        AllianceUserStaff,
        (data) => {
          allStaff.push(data);
          return allianceStaffMapper(data);
        },
      );
      pageRowCounts.push(allStaff.length - before);
    }

    const fetchReport: FetchReport = {
      totalElements,
      pageRowCounts,
      distinctCarnets: this.countDistinctCarnets(allStaff),
    };
    this._logger.log(
      `Agresso staff fetch report: ${JSON.stringify(fetchReport)}`,
    );

    // A page that failed to fetch means fewer people provisioned THIS run — `base()` catches the
    // error, logs it at `error` and returns `[]`. That is deliberately NOT an abort: the next run
    // picks those members up. The same ambiguity is fatal in the sibling deactivation spec, where
    // a short payload would deactivate everybody it omitted, which is why the completeness guard
    // travelled there with R-AGS-005 (design.md §5.1).
    const reconciliation = await this.reconciler.reconcile(allStaff);
    const outcome = await this.reconciler.applyCreateAndGrant(reconciliation);
    const summary = this.reconciler.buildSummary(
      reconciliation,
      outcome,
      allStaff.length,
    );

    // NFR-AGS-003. The controller does not await this service (RSK-4), so the caller already holds
    // a 200 and this line is the only place a human can learn what the run did.
    this._logger.log(
      `Agresso staff reconciliation summary: ${JSON.stringify(summary)}`,
    );

    return summary;
  }
}
