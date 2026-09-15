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

  private async findNumberOfPages() {
    const totalElements = await this.connection
      .getRaw<ResponseAgressoStaffDto<unknown>>(this.query(1, 1))
      .then(({ totalElements }) => totalElements);
    return (
      Math.round(totalElements / 1000) + (totalElements % 1000 !== 0 ? 1 : 0)
    );
  }

  // @akili-spec changes/agresso-staff-sec-users-sync (T-07 — accumulate pages, reconcile once)
  async cloneAllAgressoStaff() {
    const pages = await this.findNumberOfPages();
    this._logger.log(`Total pages: ${pages}`);

    // Accumulated by capturing each raw payload member as `base()` maps it. The mapper runs once
    // per item, in payload order, so `allStaff` preserves page order then row order within the
    // page — which is exactly what DD-14's FIRST-ARRIVAL collapse rule is defined against (N-2).
    // Reading `base()`'s returned entities instead would make the collapse winner depend on
    // whatever order TypeORM's `save()` happens to return, which nothing guarantees.
    const allStaff: AgressoStaffRawDto[] = [];

    for (let i = 1; i <= pages; i++) {
      this._logger.log(`Processing page: ${i} of ${pages}`);
      await this.base<AgressoStaffRawDto, AllianceUserStaff>(
        this.query(i, 1000),
        AllianceUserStaff,
        (data) => {
          allStaff.push(data);
          return allianceStaffMapper(data);
        },
      );
    }

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
