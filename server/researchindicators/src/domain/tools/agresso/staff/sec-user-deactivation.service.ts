// @akili-spec changes/agresso-staff-deactivation (T-04 measurement, T-09 apply)
//
// `measure()` is read-only. It computes the deactivation set and never writes, so a wrong
// measurement is a wrong report. `apply()` is the write. It consumes that measurement rather
// than recomputing one (design.md §18).
//
// Gate order is §20.1: interpret the resolved config, evaluate C-3, and on dry-run return
// before any transaction. C-3 is enforced only on the live branch, after that return.
// DD-D11: the transaction callback has no try/catch and returns a plain value. The catch
// sits outside `dataSource.transaction` — a catch inside the callback would commit the
// chunks that already succeeded (JS-2). The sibling's `applyCreateAndGrant` returns from
// inside its own callback; that shape is not copied here.
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { AppConfigKey } from '../../../entities/app-config/enum/app-config-key.enum';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { AgressoStaffRawDto } from './dto/agresso-staff-raw.dto';
import { DeactivationConfigResolution } from './dto/deactivation-config.dto';
import { FetchReport } from './dto/fetch-report.dto';
import { normalizeEmail, shieldKeyFor } from './email-key.util';
import { SecUserDeactivationRepository } from './sec-user-deactivation.repository';
import { ReconciliationResult } from './sec-user-reconciler.service';
import { StaffDeactivationConfigResolver } from './staff-deactivation-config.resolver';

export type DeactivationAbortReason = 'C-1' | 'C-2' | 'C-4';

/** Why one account was spared. Order here is the precedence used when several apply. */
export type ExclusionReason =
  | 'UNMATCHABLE'
  | 'EXTERNAL'
  | 'SYSTEM_ADMIN'
  | 'AMBIGUOUS';

export interface ShieldedBySkip {
  accountId: number;
  carnet: string;
  reason: string;
}

export interface DeactivationMeasurement {
  totalElements: number;
  distinctCarnets: number;
  activePopulation: number;
  /** Absent when the run aborted — an untrustworthy payload yields no set to act on. */
  candidates?: number[];
  excludedExternal: number;
  excludedSystemAdmin: number;
  excludedAmbiguous: number;
  excludedUnmatchable: number;
  shieldedBySkip: ShieldedBySkip[];
  abortReason?: DeactivationAbortReason;
  abortDetail?: Record<string, unknown>;
}

/**
 * Why `apply` did not write. `C-1`/`C-2`/`C-4` are carried from the measurement.
 * `C-3` is this method's ceiling. `WRITE_FAILED` is a rolled-back transaction:
 * the counts below it are what committed, which is nothing.
 */
export type DeactivationApplyAbortReason =
  | DeactivationAbortReason
  | 'C-3'
  | 'WRITE_FAILED';

export interface DeactivationWriteCounts {
  deactivated: number;
  rolesDeactivated: number;
  secretsDeactivated: number;
}

export interface DeactivationApplyResult extends DeactivationWriteCounts {
  dryRun: boolean;
  /** Null when the ceiling keys did not resolve. */
  ceiling: number | null;
  ceilingBreached: boolean;
  /** The measurement's candidate ids — the set a dry run reports in full. */
  candidates: number[];
  deactivationCount: number;
  activePopulation: number;
  /** Absent on success and on a dry-run report. Present only when nothing was written because the run stopped. */
  abortReason?: DeactivationApplyAbortReason;
  abortDetail?: Record<string, unknown>;
}

@Injectable()
export class SecUserDeactivationService {
  private readonly logger = new LoggerUtil({
    name: SecUserDeactivationService.name,
  });

  constructor(
    private readonly repository: SecUserDeactivationRepository,
    private readonly configResolver: StaffDeactivationConfigResolver,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Computes the deactivation set and reports it. Never throws: the controller does not await the
   * sync and the process has no `unhandledRejection` handler, so an escaping rejection would take
   * the process down (W-5, pre-existing).
   */
  async measure(
    allStaff: AgressoStaffRawDto[],
    reconciliation: ReconciliationResult,
    secUsers: SecUser[],
    fetchReport: FetchReport,
  ): Promise<DeactivationMeasurement> {
    try {
      return await this.measureOrThrow(
        allStaff,
        reconciliation,
        secUsers,
        fetchReport,
      );
    } catch (error) {
      this.logger._error(
        `Deactivation measurement failed: ${(error as Error)?.message}`,
      );
      return {
        ...this.emptyReport(fetchReport),
        abortReason: 'C-1',
        abortDetail: { unexpectedError: (error as Error)?.message },
      };
    }
  }

  /**
   * Retires `measurement.candidates`, or reports why it did not.
   *
   * Config is the caller's already-resolved read (T-07). This method does not
   * re-read `app_config`. C-4 is not re-checked here: it already ran inside
   * `measure()`, and a second copy would be a second rule.
   *
   * Never throws, for the same reason `measure()` does not (W-5). A write
   * failure is reported after the transaction has rolled back.
   */
  async apply(
    measurement: DeactivationMeasurement,
    config: DeactivationConfigResolution,
  ): Promise<DeactivationApplyResult> {
    const dryRun = config.config.dryRun;
    const ids = measurement.candidates;

    // An aborted measurement has no set. Do not invent one and do not write.
    if (measurement.abortReason != null || ids == null) {
      if (measurement.abortReason) {
        this.logger._error(
          `Deactivation apply skipped: ${measurement.abortReason} ${JSON.stringify(measurement.abortDetail ?? {})}`,
        );
      }
      return {
        ...this.zeroWrites(),
        dryRun,
        ceiling: null,
        ceilingBreached: false,
        candidates: ids ?? [],
        deactivationCount: ids?.length ?? 0,
        activePopulation: measurement.activePopulation,
        ...(measurement.abortReason
          ? {
              abortReason: measurement.abortReason,
              abortDetail: measurement.abortDetail,
            }
          : {}),
      };
    }

    // Evaluate C-3 before the dry-run branch. Enforce it only after (§20.1).
    const evaluation = this.evaluateCeiling(
      config,
      measurement.activePopulation,
      ids.length,
    );
    const report: DeactivationApplyResult = {
      ...this.zeroWrites(),
      dryRun,
      ceiling: evaluation.ceiling,
      ceilingBreached: evaluation.ceilingBreached,
      candidates: ids,
      deactivationCount: ids.length,
      activePopulation: measurement.activePopulation,
    };

    if (dryRun) {
      this.logger._log(
        `Deactivation apply dry-run: count=${ids.length} ceiling=${evaluation.ceiling} breached=${evaluation.ceilingBreached}`,
      );
      return report;
    }

    if (evaluation.ceilingUnusable || evaluation.ceilingBreached) {
      const abortDetail = evaluation.ceilingUnusable
        ? {
            ceilingFraction: config.config.ceilingFraction,
            absoluteFloor: config.config.absoluteFloor,
            failures: config.failures.filter(
              (failure) => failure.abortReason === 'C-3',
            ),
          }
        : {
            deactivationCount: ids.length,
            activePopulation: measurement.activePopulation,
            ceiling: evaluation.ceiling,
          };
      this.logger._error(
        `Deactivation aborted: C-3 ${JSON.stringify(abortDetail)}`,
      );
      return { ...report, abortReason: 'C-3', abortDetail };
    }

    try {
      // APPLY_TX_CALLBACK_START
      const written = await this.dataSource.transaction(async (manager) => {
        const secretsDeactivated = await this.repository.deactivateAppSecrets(
          manager,
          ids,
        );
        const rolesDeactivated = await this.repository.deactivateSecUserRoles(
          manager,
          ids,
        );
        const deactivated = await this.repository.deactivateSecUsers(
          manager,
          ids,
        );
        return { deactivated, rolesDeactivated, secretsDeactivated };
      });
      // APPLY_TX_CALLBACK_END
      return { ...report, ...written };
    } catch (error) {
      const message = (error as Error)?.message;
      this.logger._error(`Deactivation write rolled back: ${message}`);
      return {
        ...report,
        abortReason: 'WRITE_FAILED',
        abortDetail: { message },
      };
    }
  }

  /**
   * `size <= max(fraction × activePopulation, floor)`. A loud-key failure, a
   * null, or a value `<= 0` cannot be evaluated and is treated as breached so
   * a missing ceiling never becomes "no ceiling" (`R-AGD-010` AC.3). No upper
   * bound: `R-AGD-011` accepts any finite fraction `> 0`.
   */
  private evaluateCeiling(
    config: DeactivationConfigResolution,
    activePopulation: number,
    setSize: number,
  ): {
    ceiling: number | null;
    ceilingBreached: boolean;
    ceilingUnusable: boolean;
  } {
    const { ceilingFraction, absoluteFloor } = config.config;
    const loudFailure = config.failures.some(
      (failure) => failure.abortReason === 'C-3',
    );
    const ceilingUnusable =
      loudFailure ||
      ceilingFraction == null ||
      absoluteFloor == null ||
      !(ceilingFraction > 0) ||
      !(absoluteFloor > 0);

    if (ceilingUnusable) {
      return { ceiling: null, ceilingBreached: true, ceilingUnusable: true };
    }

    const ceiling = Math.max(ceilingFraction * activePopulation, absoluteFloor);
    return {
      ceiling,
      ceilingBreached: setSize > ceiling,
      ceilingUnusable: false,
    };
  }

  private zeroWrites(): DeactivationWriteCounts {
    return { deactivated: 0, rolesDeactivated: 0, secretsDeactivated: 0 };
  }

  private async measureOrThrow(
    allStaff: AgressoStaffRawDto[],
    reconciliation: ReconciliationResult,
    secUsers: SecUser[],
    fetchReport: FetchReport,
  ): Promise<DeactivationMeasurement> {
    const resolution = await this.configResolver.resolve();
    const activePopulation = secUsers.filter((u) => u.is_active).length;
    const base = { ...this.emptyReport(fetchReport), activePopulation };

    // ---- Preconditions. An untrustworthy payload produces NO candidate set, only counts. -------
    const abort = await this.checkPreconditions(fetchReport, resolution);
    if (abort) {
      this.logger._error(
        `Deactivation aborted: ${abort.abortReason} ${JSON.stringify(abort.abortDetail)}`,
      );
      return { ...base, ...abort };
    }
    const externalStatusId = (
      await this.repository.resolveExternalStatusId(
        resolution.config.externalStatusId,
      )
    ).statusId as number;

    // ---- Shields, built from the RAW payload, before validation and before the collapse. -------
    // Neither step can remove a shield because neither has run yet when this is computed.
    const shieldKeys = new Set<string>();
    for (const member of allStaff) {
      const key = shieldKeyFor(member?.email);
      if (key !== null) {
        shieldKeys.add(key);
      }
    }

    // Candidates start as every ACTIVE row, minus the shields. `matchedIds` is deliberately NOT
    // subtracted: every matched member's key is in the payload and therefore already a shield, so
    // subtracting it was dead code that also made EX-3's rationale unreachable (JD-7).
    const active = secUsers.filter((u) => u.is_active);
    const afterShields = active.filter(
      (u) => !shieldKeys.has(this.keyOf(u)) || this.keyOf(u).length === 0,
    );

    // ---- Exclusions ----------------------------------------------------------------------------
    // EX-3 is evaluated over candidates-after-shields, never over the whole index: a key present in
    // the payload is already shielded, so ambiguity here can only involve keys the payload does not
    // carry — where every row under the key is a candidate, which is what makes "exclude every row"
    // and "count both" agree (JD-7).
    const keyCounts = new Map<string, number>();
    for (const user of afterShields) {
      const key = this.keyOf(user);
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    }

    const adminIds = new Set(
      await this.repository.findActiveSystemAdminUserIds(
        afterShields.map((u) => Number(u.sec_user_id)),
      ),
    );

    const candidates: number[] = [];
    const counts = {
      excludedUnmatchable: 0,
      excludedExternal: 0,
      excludedSystemAdmin: 0,
      excludedAmbiguous: 0,
    };

    for (const user of afterShields) {
      const id = Number(user.sec_user_id);
      const key = this.keyOf(user);
      const reason = this.exclusionFor(user, key, keyCounts, adminIds, {
        externalStatusId,
        id,
      });

      if (reason === null) {
        candidates.push(id);
        continue;
      }
      counts[this.counterFor(reason)] += 1;
      this.logger._warn(`Account ${id} spared from deactivation: ${reason}`);
    }

    return {
      ...base,
      ...counts,
      candidates,
      shieldedBySkip: this.reportShieldedBySkip(reconciliation, active),
    };
  }

  /** C-1, C-2 and C-4. Returns the abort, or `null` when the payload can be trusted. */
  private async checkPreconditions(
    fetchReport: FetchReport,
    resolution: DeactivationConfigResolution,
  ): Promise<Pick<
    DeactivationMeasurement,
    'abortReason' | 'abortDetail'
  > | null> {
    const { totalElements, pageRowCounts, distinctCarnets } = fetchReport;

    if (!(totalElements > 0)) {
      return { abortReason: 'C-1', abortDetail: { totalElements } };
    }

    // Every page EXCEPT the last. After the ceil fix the final page holds `total % pageSize` rows,
    // so a single mid-run departure can legitimately empty it — aborting on that would redden a
    // healthy run, and the distinctness clause below sees the same shortfall anyway (JS-5).
    const emptyPage = pageRowCounts
      .slice(0, -1)
      .findIndex((count) => count === 0);
    if (emptyPage !== -1) {
      return {
        abortReason: 'C-2',
        abortDetail: { emptyPageNumber: emptyPage + 1, pageRowCounts },
      };
    }

    // DISTINCT carnets, not row count. Under unstable offset pagination a repeated record inflates
    // the row count by exactly what an omitted record deflates it, so the two cancel and a run that
    // silently lost people reports complete (JD-1). One-sided: a surplus never aborts, because more
    // members means fewer candidates, which is always the safe direction.
    if (distinctCarnets < totalElements) {
      return {
        abortReason: 'C-2',
        abortDetail: {
          distinctCarnets,
          totalElements,
          duplicatedCarnets: fetchReport.duplicatedCarnets,
        },
      };
    }

    const externalConfigFailed = resolution.failures.some(
      (failure) =>
        failure.key === AppConfigKey.ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID,
    );
    if (externalConfigFailed || resolution.config.externalStatusId == null) {
      return {
        abortReason: 'C-4',
        abortDetail: {
          externalStatusMatches: 0,
          configKey: AppConfigKey.ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID,
        },
      };
    }

    const external = await this.repository.resolveExternalStatusId(
      resolution.config.externalStatusId,
    );
    if (external.matchCount !== 1) {
      return {
        abortReason: 'C-4',
        abortDetail: { externalStatusMatches: external.matchCount },
      };
    }

    return null;
  }

  private exclusionFor(
    user: SecUser,
    key: string,
    keyCounts: Map<string, number>,
    adminIds: Set<number>,
    ctx: { externalStatusId: number; id: number },
  ): ExclusionReason | null {
    // EX-4 — an account whose own key is empty can be matched by nothing, so its absence from the
    // payload carries no information about the person.
    if (key.length === 0) {
      return 'UNMATCHABLE';
    }
    // EX-1 — external users are provisioned by another flow and never appear in a staff payload.
    if (
      user.status_id != null &&
      Number(user.status_id) === ctx.externalStatusId
    ) {
      return 'EXTERNAL';
    }
    // EX-2 — active admin roles only, so an ex-admin is not shielded.
    if (adminIds.has(ctx.id)) {
      return 'SYSTEM_ADMIN';
    }
    // EX-3 — active rows only (F-10): an already-inactive duplicate must not shield its live twin.
    if ((keyCounts.get(key) ?? 0) > 1) {
      return 'AMBIGUOUS';
    }
    return null;
  }

  /**
   * Which accounts a SKIPPED staff member is holding open. Reported with the account id and the
   * skip reason so the underlying data problem stays visible rather than silently benign.
   */
  private reportShieldedBySkip(
    reconciliation: ReconciliationResult,
    activeUsers: SecUser[],
  ): ShieldedBySkip[] {
    const byKey = new Map<string, SecUser[]>();
    for (const user of activeUsers) {
      const key = this.keyOf(user);
      if (key.length === 0) continue;
      const bucket = byKey.get(key);
      if (bucket) {
        bucket.push(user);
      } else {
        byKey.set(key, [user]);
      }
    }

    const shielded: ShieldedBySkip[] = [];
    for (const skipped of reconciliation.skipped ?? []) {
      const key = shieldKeyFor(skipped.staffMember?.email);
      if (key === null) continue;
      for (const user of byKey.get(key) ?? []) {
        shielded.push({
          accountId: Number(user.sec_user_id),
          carnet: skipped.staffMember?.resourceId,
          reason: skipped.reason,
        });
      }
    }
    return shielded;
  }

  private keyOf(user: SecUser): string {
    return user?.email == null ? '' : normalizeEmail(user.email);
  }

  private counterFor(
    reason: ExclusionReason,
  ):
    | 'excludedUnmatchable'
    | 'excludedExternal'
    | 'excludedSystemAdmin'
    | 'excludedAmbiguous' {
    switch (reason) {
      case 'UNMATCHABLE':
        return 'excludedUnmatchable';
      case 'EXTERNAL':
        return 'excludedExternal';
      case 'SYSTEM_ADMIN':
        return 'excludedSystemAdmin';
      case 'AMBIGUOUS':
        return 'excludedAmbiguous';
    }
  }

  private emptyReport(fetchReport: FetchReport): DeactivationMeasurement {
    return {
      totalElements: fetchReport.totalElements,
      distinctCarnets: fetchReport.distinctCarnets,
      activePopulation: 0,
      excludedExternal: 0,
      excludedSystemAdmin: 0,
      excludedAmbiguous: 0,
      excludedUnmatchable: 0,
      shieldedBySkip: [],
    };
  }
}
