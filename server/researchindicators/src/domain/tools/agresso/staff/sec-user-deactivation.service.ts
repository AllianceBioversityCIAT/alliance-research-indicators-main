// @akili-spec changes/agresso-staff-deactivation (T-04 — shields, exclusions, preconditions)
//
// READ-ONLY BY CONSTRUCTION. This increment measures the deactivation set and reports it; it does
// not retire anything. There is no transaction here and no write statement anywhere beneath it —
// not a guarded write, not one that rolls back. That is what makes this increment safe to run
// against real data while the numbers it produces are still unverified: every way it can be wrong
// yields a wrong REPORT, which a human reads, rather than a wrong RETIREMENT, which nothing undoes.
import { Injectable } from '@nestjs/common';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { AgressoStaffRawDto } from './dto/agresso-staff-raw.dto';
import { FetchReport } from './dto/fetch-report.dto';
import { normalizeEmail, shieldKeyFor } from './email-key.util';
import { SecUserDeactivationRepository } from './sec-user-deactivation.repository';
import { ReconciliationResult } from './sec-user-reconciler.service';

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

@Injectable()
export class SecUserDeactivationService {
  private readonly logger = new LoggerUtil({
    name: SecUserDeactivationService.name,
  });

  constructor(private readonly repository: SecUserDeactivationRepository) {}

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

  private async measureOrThrow(
    allStaff: AgressoStaffRawDto[],
    reconciliation: ReconciliationResult,
    secUsers: SecUser[],
    fetchReport: FetchReport,
  ): Promise<DeactivationMeasurement> {
    const activePopulation = secUsers.filter((u) => u.is_active).length;
    const base = { ...this.emptyReport(fetchReport), activePopulation };

    // ---- Preconditions. An untrustworthy payload produces NO candidate set, only counts. -------
    const abort = await this.checkPreconditions(fetchReport);
    if (abort) {
      this.logger._error(
        `Deactivation aborted: ${abort.abortReason} ${JSON.stringify(abort.abortDetail)}`,
      );
      return { ...base, ...abort };
    }
    const externalStatusId = (await this.repository.resolveExternalStatusId())
      .statusId as number;

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

    const external = await this.repository.resolveExternalStatusId();
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
