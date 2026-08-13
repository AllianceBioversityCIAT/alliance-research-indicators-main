import { Injectable } from '@nestjs/common';
import { TemplateService } from '../../../shared/auxiliar/template/template.service';
import { TemplateEnum } from '../../../shared/auxiliar/template/enum/template.enum';
import { MessageMicroservice } from '../../../tools/broker/message.microservice';
import { EmailBody } from '../../../tools/broker/dto/mailer.dto';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { EnvAppConfigUtil } from '../../../shared/utils/env-app-config.util';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { cleanName } from '../../../shared/utils/object.utils';
import { QueryIndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { ReportingPlatformEnum } from '../../results/enum/reporting-platform.enum';
import {
  CapdevBulkEmailTemplateDto,
  CapdevMetricsTemplateFields,
} from './dto/capdev-bulk-email-template.dto';
import {
  CapdevBulkCountriesDto,
  CapdevBulkGroupDto,
  CapdevBulkMetricsDto,
  CapdevBulkProcessMetricsInput,
  CapdevBulkTokenOwnerDto,
} from './dto/capdev-bulk-group.dto';
import { NotificationStatus } from './enum/notification-status.enum';
import { CapdevBulkNotificationRepository } from './capdev-bulk-notification.repository';
import { formatCapdevMetrics } from './capdev-metrics.formatter';
import {
  build as buildRecipients,
  CapdevRecipientFileContact,
  CapdevRecipients,
} from './capdev-recipients.builder';

/**
 * Outcome of one group's {@link CapdevBulkNotificationService.sendGroupNotification}
 * call. **Internal to this stage — never persisted as-is.** T-09 aggregates
 * these across a batch into the four *persisted* `NotificationStatus` values
 * (`notification-status.enum.ts`); `NO_TEMPLATE` deliberately has no
 * counterpart there (design.md §6.2).
 */
export enum CapdevGroupSendStatus {
  /** The template rendered and `MessageMicroservice.sendEmail` was called. */
  SENT = 'SENT',
  /**
   * `_getTemplate` returned empty/undefined, or threw (missing/inactive
   * `sec_template` row) — treated identically per design.md §6.2. Zero
   * `sendEmail` calls occur; exactly one error log is emitted here
   * (R-CBU-007 AC.5).
   */
  NO_TEMPLATE = 'NO_TEMPLATE',
}

export interface CapdevGroupSendOutcome {
  status: CapdevGroupSendStatus;
  agreementId: string;
}

/**
 * Everything one group's send needs, once T-09's orchestration has already
 * resolved the group's recipients (`capdev-recipients.builder.ts` — a `null`
 * result there means "skip the group", never reaches this method) and its
 * metrics (`capdev-metrics.formatter.ts`). This service does not query the
 * database and does not decide whether a group should be attempted.
 */
export interface CapdevGroupSendInput {
  /** Bulk process id — carried into the `NO_TEMPLATE` error log (design.md §10). */
  processId: number;
  /** Subject `[<agreement_id>]` token and template-key correlation only — not a DB lookup key here. */
  agreementId: string;
  /** T-07's pre-rendered, `{{#if}}`-safe string fields. */
  metrics: CapdevMetricsTemplateFields;
  /** T-06's resolved `{ to, cc, salutation }` — `to` is always exactly the PI. */
  recipients: CapdevRecipients;
  /**
   * Q1's `bulk_upload_processes.created_by` → `sec_users` join result.
   * **Non-nullable by design** (design.md §6.1 — the join is process-level
   * and "durably resolvable"). T-09's call site owns proving that guarantee
   * where the data is fetched; this method does not silently degrade a
   * missing owner into a blank contact sentence (Judgment Day: `null` was
   * previously reachable and *silently* handled, which is the class DD-4
   * exists to keep out of Handlebars — see `resolveTokenOwnerContact`).
   */
  tokenOwner: CapdevBulkTokenOwnerDto;
}

/**
 * The `notification_status` derivation table (tasks.md T-09), written as
 * the single source rather than five scattered `if`s. Exported so it is
 * testable in isolation, independent of the database/broker/config plumbing
 * `dispatch()` wires around it.
 *
 * | flag | groups | dispatched      | status    |
 * | ---- | ------ | --------------- | --------- |
 * | any  | 0      | —               | `SKIPPED` (`sent_at` null) |
 * | off  | > 0    | 0               | `SKIPPED` (`sent_at` null) |
 * | on   | > 0    | = groups        | `SENT`    |
 * | on   | > 0    | 0               | `FAILED`  |
 * | on   | > 0    | 0 < n < groups  | `PARTIAL` |
 *
 * **`SENT` means "handed to the broker", not "delivered."**
 * `MessageMicroservice.sendEmail` is `client.emit` — fire-and-forget, with no
 * delivery acknowledgement. A broker-side failure after the call returns
 * will never surface here and will never turn a `SENT`/`PARTIAL` batch into
 * `FAILED`/`PARTIAL` after the fact — that weaker guarantee is existing
 * platform behaviour (design.md §6.6, T-08 advisory 1), not a defect this
 * derivation can fix. Read `notification_status = 'SENT'` accordingly.
 *
 * @param enabled the feature flag's resolved value. Ignored when
 * `groupCount === 0` (the "any / 0 / — / SKIPPED" row) — callers may pass
 * either boolean without affecting the result.
 */
export function deriveNotificationStatus(
  enabled: boolean,
  groupCount: number,
  dispatchedCount: number,
): NotificationStatus {
  if (groupCount === 0) return NotificationStatus.SKIPPED;
  if (!enabled) return NotificationStatus.SKIPPED;
  if (dispatchedCount === groupCount) return NotificationStatus.SENT;
  if (dispatchedCount === 0) return NotificationStatus.FAILED;
  return NotificationStatus.PARTIAL;
}

/**
 * The full CapDev bulk-upload notification stage (design.md §2.1, §6.1,
 * §6.2, §6.6, §10; requirements.md R-CBU-001, R-CBU-002, R-CBU-007,
 * R-CBU-008, R-CBU-009, R-CBU-011, NFR-CBU-002, NFR-CBU-003).
 *
 * **Scope boundary (binding, tasks.md T-08 / T-09):** T-08 delivered
 * {@link sendGroupNotification} — the per-group build + render + dispatch —
 * and this task (T-09) adds {@link dispatch}: the four repository reads, the
 * feature-flag gate (evaluated **after** metric persistence, never before —
 * design.md §2.1), the per-group loop with per-group failure isolation, and
 * the aggregate `notification_status` write. This class is now fully
 * constructible but **not yet registered** in `ai-reports.module.ts` and not
 * yet called from `ResultsService` — both are T-10.
 *
 * **Failure containment is split by design.** `sendGroupNotification` never
 * throws for a missing template — that branch is internal and returns
 * {@link CapdevGroupSendStatus.NO_TEMPLATE}. It deliberately does **not**
 * catch a `MessageMicroservice.sendEmail` rejection or any other unexpected
 * error: design.md §6.6's per-group `try/catch`, implemented in
 * {@link dispatch}, is the single logger for a real send failure — R-CBU-010
 * AC.5 requires exactly one error log per caught failure, not one per layer.
 */
@Injectable()
export class CapdevBulkNotificationService {
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: CapdevBulkNotificationService.name,
  });

  constructor(
    private readonly repository: CapdevBulkNotificationRepository,
    private readonly templateService: TemplateService,
    private readonly messageMicroservice: MessageMicroservice,
    private readonly appConfig: AppConfig,
    private readonly envAppConfig: EnvAppConfigUtil,
  ) {}

  /**
   * Orchestrates the whole notification stage for one bulk process
   * (design.md §2.1). **Step order is the requirement, not a detail:** the
   * feature-flag gate sits AFTER `repository.persistProcessMetrics`'s
   * write, never before it — gating the four reads/the write behind the
   * flag would satisfy "no email" while silently failing R-CBU-008 and
   * R-CBU-009 AC.1/AC.2 (a flag-off run must still persist metrics and
   * record `SKIPPED`).
   *
   * @param processId bulk process id (`bulk_upload_processes.id`).
   * @param fileContacts file-sourced contacts from the AI payload
   * (`metadata.contacts` — R-CBU-005). Structurally compatible with
   * `AiContactDto[]`; declared against the builder's own minimal interface
   * so this module stays dependency-free of the `results` module (mirrors
   * `capdev-recipients.builder.ts`'s own reasoning).
   */
  async dispatch(
    processId: number,
    fileContacts: CapdevRecipientFileContact[] = [],
  ): Promise<void> {
    // 1-4: four grouped reads (design.md §6.1) — always run, regardless of
    // the flag or the group count, because their output feeds the write in
    // step 5 unconditionally. Plus one ungrouped scalar read for
    // `total_results`, which is batch-wide and neither indicator- nor
    // contract-filtered (§4.1) — see `countTotalResults`.
    const { groups } = await this.repository.findGroups(processId);
    const metricsRows = await this.repository.findMetrics(processId);
    const countriesRows = await this.repository.findCountries(processId);
    const unattributedResultIds =
      await this.repository.findUnattributedResultIds(processId);
    const totalResults = await this.repository.countTotalResults(processId);

    const metricsByAgreementId = new Map(
      metricsRows.map((row) => [row.agreement_id, row]),
    );
    const countriesByAgreementId = new Map(
      countriesRows.map((row) => [row.agreement_id, row]),
    );

    // Q4's unattributed warn — names the result_ids (R-CBU-002 AC.3, §10);
    // a scalar count could not satisfy this. The multi-primary tie-break
    // warn is already emitted inside `repository.findGroups` (T-05) and is
    // not duplicated here.
    if (unattributedResultIds.length > 0) {
      this.logger._warn(
        `${unattributedResultIds.length} CapDev result(s) with no active ` +
          `primary contract excluded from every group ` +
          `(bulk_upload_process_id=${processId}): result_id=[${unattributedResultIds.join(', ')}]`,
      );
    }

    const aggregate = this.buildAggregate(
      groups,
      metricsByAgreementId,
      countriesByAgreementId,
      totalResults,
    );

    this.logger._log(
      `Dispatch start (bulk_upload_process_id=${processId}): ` +
        `groups=${groups.length}, capdev_results=${aggregate.total_capdev_results ?? 0}`,
    );

    // 5: WRITE — metrics persisted unconditionally, from the same values
    // the email itself will be built from (R-CBU-008 AC.6). This happens
    // BEFORE the flag is even read.
    await this.repository.persistProcessMetrics(processId, aggregate);

    if (groups.length === 0) {
      // "any / 0 / — / SKIPPED" — no groups means nothing to gate; the flag
      // is never even read.
      await this.finish(processId, false, 0, 0);
      return;
    }

    // 6: flag gate — strictly AFTER the write above.
    const { value: enabled, defaulted: enabledDefaulted } =
      await this.envAppConfig.CAPDEV_BULK_UPLOAD_ENABLED();
    if (enabledDefaulted) {
      this.logger._warn(
        `Config row absent for EMAIL.CAPDEV_BULK_UPLOAD.ENABLED — defaulted ` +
          `to disabled (bulk_upload_process_id=${processId})`,
      );
    }

    if (!enabled) {
      this.logger._warn(
        `CapDev bulk notification disabled — skipping dispatch for ` +
          `${groups.length} group(s) (bulk_upload_process_id=${processId})`,
      );
      await this.finish(processId, false, groups.length, 0);
      return;
    }

    const { value: configuredCc, defaulted: ccDefaulted } =
      await this.envAppConfig.CAPDEV_BULK_UPLOAD_CC_EMAIL();
    if (ccDefaulted) {
      this.logger._warn(
        `Config row absent for EMAIL.CAPDEV_BULK_UPLOAD.CC_EMAIL — defaulted ` +
          `to [] (bulk_upload_process_id=${processId})`,
      );
    }

    // §2.2 / JD-S2 — `AppConfig.SPRM_EMAIL_ARRAY` is unsafe to call bare
    // (`process.env.ARI_SPRM_EMAIL.split(',')`, unguarded). Read defensively
    // here and pass the parsed array into the pure builder.
    const sprmEmails = (process.env.ARI_SPRM_EMAIL ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    // 7: per-group loop — try { buildRecipients -> render -> send } catch.
    let dispatchedCount = 0;
    for (const group of groups) {
      try {
        const tokenOwner = group.token_owner;
        if (!tokenOwner) {
          // design.md §6.1 declares this unreachable: `created_by` is
          // written before `AiReportsService.create()` runs, so reaching
          // this branch means that invariant broke. Error level, not warn —
          // a fallback (support address, empty string) would hide a broken
          // invariant and still fail R-CBU-007 AC.4's "by name" requirement.
          // Counts as not dispatched.
          this.logger._error(
            `Token owner unresolved for agreement_id=${group.agreement_id} ` +
              `(bulk_upload_process_id=${processId}) — created_by invariant ` +
              `broken (design.md §6.1 declares this unreachable); skipping group`,
          );
          continue;
        }

        const recipients = buildRecipients(
          group,
          fileContacts,
          sprmEmails,
          configuredCc,
        );
        if (!recipients) {
          // capdev-recipients.builder.ts returns null when the PI address
          // is unresolvable — never backfilled from CC (R-CBU-003).
          this.logger._warn(
            `No resolvable PI for agreement_id=${group.agreement_id} ` +
              `(bulk_upload_process_id=${processId}) reason=NO_PI`,
          );
          continue;
        }

        // R-CBU-004 AC.4 / tasks.md T-12 orphaned AC — `dropped` is the
        // builder's *return value*, not a side effect (T-06's purity gate);
        // this is the one place with both the process id and the malformed
        // value, so this is where the debug line design.md §10 requires is
        // emitted, one per dropped entry. `?? []` guards against a future
        // construction site that omits the field — unreachable today (a
        // single TS-enforced call site), but without it a `TypeError: not
        // iterable` here would land inside this group's `try`, misreporting
        // every group as a broker failure (Leader fold 1, risk lens).
        for (const value of recipients.dropped ?? []) {
          // CRLF-neutralised before interpolation (Leader fold 2, risk
          // lens): the value is DB-sourced (`alliance_user_staff` / a
          // configured CC row), not only AI-payload-sourced, so `@IsEmail()`
          // on `AiContactDto` does not close this vector. Sanitising at the
          // log site — not in the builder — keeps the builder pure and its
          // returned `dropped` value faithful to what was actually dropped.
          const safeValue = value.replace(/[\r\n]/g, ' ');
          this.logger._debug(
            `Recipient dropped for agreement_id=${group.agreement_id} ` +
              `(bulk_upload_process_id=${processId}): ${safeValue}`,
          );
        }

        const metricsRow =
          metricsByAgreementId.get(group.agreement_id) ??
          this.emptyMetrics(group.agreement_id);
        const countriesRow = countriesByAgreementId.get(group.agreement_id);
        const templateMetrics = formatCapdevMetrics(
          metricsRow,
          countriesRow?.country_names ?? [],
        );

        const outcome = await this.sendGroupNotification({
          processId,
          agreementId: group.agreement_id,
          metrics: templateMetrics,
          recipients,
          tokenOwner,
        });

        if (outcome.status === CapdevGroupSendStatus.SENT) {
          dispatchedCount += 1;
          // NFR-CBU-003 — counts only, never addresses.
          this.logger._log(
            `Notification sent for agreement_id=${group.agreement_id} ` +
              `(bulk_upload_process_id=${processId}) to=${recipients.to.length} ` +
              `cc=${recipients.cc.length} trainings=${metricsRow.trainings_count}`,
          );
        }
        // NO_TEMPLATE already logged its one error line inside
        // sendGroupNotification/safeGetTemplate — no second log here.
      } catch (err) {
        // The single logger for a real send/query failure propagating out
        // of sendGroupNotification (design.md §6.6; R-CBU-010 AC.5 —
        // exactly one error log per caught failure).
        this.logger._error(
          `Notification failed for agreement_id=${group.agreement_id} ` +
            `(bulk_upload_process_id=${processId}): ` +
            `${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 8: WRITE — aggregate status, derived from the single table below.
    await this.finish(processId, true, groups.length, dispatchedCount);
  }

  /**
   * 8: WRITE. `sent_at` is derived from the status just computed — never
   * from `dispatchedCount` again — so R-CBU-008 AC.4 ("`sent_at` null
   * whenever status is `SKIPPED`") is structural rather than a coincidence
   * of every call site happening to agree. `SENT`/`PARTIAL` are the only
   * statuses that mean at least one group dispatched (see
   * `deriveNotificationStatus`'s table); `SKIPPED`/`FAILED` are always null.
   */
  private async finish(
    processId: number,
    enabled: boolean,
    groupCount: number,
    dispatchedCount: number,
  ): Promise<void> {
    const status = deriveNotificationStatus(
      enabled,
      groupCount,
      dispatchedCount,
    );
    const sentAt =
      status === NotificationStatus.SENT ||
      status === NotificationStatus.PARTIAL
        ? new Date()
        : null;
    await this.repository.updateNotificationStatus(processId, status, sentAt);
  }

  /**
   * Batch-level aggregate for `persistProcessMetrics` (design.md §4.1).
   *
   * `total_capdev_results` is the **sum of the per-group training counts**
   * (R-CBU-008 AC.1) — it deliberately excludes Q4's unattributed results,
   * which belong to no group. `countries` is the batch-wide distinct set of
   * ISO alpha-2 codes across every group's Q3 row.
   *
   * `total_results` is the one column in §4.1 that is genuinely batch-wide —
   * unfiltered by indicator **and** by contract — so it is passed in
   * pre-computed from `repository.countTotalResults`, not derived from the
   * CapDev-scoped `groups`/`metricsByAgreementId` this method otherwise
   * folds over.
   */
  private buildAggregate(
    groups: CapdevBulkGroupDto[],
    metricsByAgreementId: Map<string, CapdevBulkMetricsDto>,
    countriesByAgreementId: Map<string, CapdevBulkCountriesDto>,
    totalResults: number,
  ): CapdevBulkProcessMetricsInput {
    let totalCapdevResults = 0;
    let totalParticipants = 0;
    let totalFemaleParticipants = 0;
    let activityStartDate: Date | null = null;
    let activityEndDate: Date | null = null;
    const isoCodes = new Set<string>();

    for (const group of groups) {
      const metrics = metricsByAgreementId.get(group.agreement_id);
      if (metrics) {
        totalCapdevResults += metrics.trainings_count;
        totalParticipants += metrics.participants_total;
        totalFemaleParticipants += metrics.female_participants_total;
        if (
          metrics.start_date &&
          (!activityStartDate || metrics.start_date < activityStartDate)
        ) {
          activityStartDate = metrics.start_date;
        }
        if (
          metrics.end_date &&
          (!activityEndDate || metrics.end_date > activityEndDate)
        ) {
          activityEndDate = metrics.end_date;
        }
      }

      const countries = countriesByAgreementId.get(group.agreement_id);
      for (const iso of countries?.iso_alpha2_list ?? []) {
        if (iso) isoCodes.add(iso);
      }
    }

    return {
      total_results: totalResults,
      total_capdev_results: totalCapdevResults,
      total_participants: totalParticipants,
      total_female_participants: totalFemaleParticipants,
      activity_start_date: activityStartDate,
      activity_end_date: activityEndDate,
      countries: Array.from(isoCodes),
    };
  }

  /** Defensive fallback — Q1 and Q2 share the same join spine, so every group returned by `findGroups` should have a matching `findMetrics` row; this only guards against that invariant breaking. */
  private emptyMetrics(agreementId: string): CapdevBulkMetricsDto {
    return {
      agreement_id: agreementId,
      trainings_count: 0,
      participants_total: 0,
      female_participants_total: 0,
      start_date: null,
      end_date: null,
    };
  }

  /**
   * Builds the template DTO, renders it against the real `sec_template` row
   * (`TemplateEnum.CAPDEV_BULK_UPLOAD_SUMMARY`), assembles the `EmailBody`
   * and dispatches it. Returns an outcome for the caller (T-09) to
   * aggregate — see {@link CapdevGroupSendOutcome}.
   */
  async sendGroupNotification(
    input: CapdevGroupSendInput,
  ): Promise<CapdevGroupSendOutcome> {
    const templateData = this.buildTemplateData(input);
    const { html, queryFailed } = await this.safeGetTemplate(templateData);

    if (!html) {
      // Advisory fold (tasks.md T-09): `queryFailed` distinguishes a
      // transient DataSource error from a genuinely missing/inactive row —
      // both are `NO_TEMPLATE` per design.md §6.2, but R-CBU-011 AC.3's
      // skipped-vs-failed line stays legible in production logs for a cause
      // that is neither. `safeGetTemplate`'s control flow is unchanged.
      this.logger._error(
        `No active template for key="${TemplateEnum.CAPDEV_BULK_UPLOAD_SUMMARY}" — ` +
          `notification skipped for agreement_id=${input.agreementId} ` +
          `(bulk_upload_process_id=${input.processId}) ` +
          `cause=${queryFailed ? 'TEMPLATE_QUERY_ERROR' : 'TEMPLATE_MISSING_OR_INACTIVE'}`,
      );
      return {
        status: CapdevGroupSendStatus.NO_TEMPLATE,
        agreementId: input.agreementId,
      };
    }

    const emailBody: EmailBody = {
      subject: this.buildSubject(input.agreementId),
      to: input.recipients.to,
      cc: input.recipients.cc,
      message: {
        // Never `message.text` — the rendered HTML goes in `socketFile` as a
        // Buffer, matching every existing MessageMicroservice caller
        // (design.md §2.2, JD-S4). `text` stays unset.
        socketFile: Buffer.from(html),
      },
    };
    await this.messageMicroservice.sendEmail(emailBody);

    return {
      status: CapdevGroupSendStatus.SENT,
      agreementId: input.agreementId,
    };
  }

  /**
   * Wraps `TemplateService._getTemplate` (design.md §6.2). Its real
   * implementation (`template.service.ts`) destructures `{ template }` from
   * `findOne(...)`'s result — a `null` result (no active row) throws
   * `TypeError` rather than resolving falsy. Both that throw and a
   * present-but-empty/undefined return are the same `NO_TEMPLATE` outcome to
   * every caller of this accessor; it does not log — the single caller
   * above owns the one required error log line.
   *
   * `queryFailed` is the one-line distinguishing marker folded in per
   * tasks.md T-09's advisory: it is `true` only for the `catch` path (a
   * throw — plausibly a transient DataSource error), `false` for a
   * present-but-empty/undefined template (genuinely no active row). The
   * bare `catch` itself is unchanged — this only labels which side of it
   * was taken.
   */
  private async safeGetTemplate(
    data: CapdevBulkEmailTemplateDto,
  ): Promise<{ html: string | null; queryFailed: boolean }> {
    try {
      const rendered =
        await this.templateService._getTemplate<CapdevBulkEmailTemplateDto>(
          TemplateEnum.CAPDEV_BULK_UPLOAD_SUMMARY,
          data,
        );
      return { html: rendered ? rendered : null, queryFailed: false };
    } catch {
      return { html: null, queryFailed: true };
    }
  }

  /** `[{agreement_id}] Training Results...` — R-CBU-007 AC.2. No environment
   * marker: `MessageMicroservice.sendEmail` already threads
   * `AppConfig.ARI_MIS_ENV` through as its own `environment` field
   * (`message.microservice.ts`), so prefixing the subject here would double
   * it. */
  private buildSubject(agreementId: string): string {
    return `[${agreementId}] Training Results Successfully Recorded in the Alliance Institutional Reporting System`;
  }

  /**
   * `{AppConfig.ARI_CLIENT_HOST}/results-center` + the canonical
   * `source`/`indicator`/`contract` query triple, via the existing
   * `COMPLETE_CLIENT_HOST` helper (`app-config.util.ts`) rather than
   * string-concatenating the host by hand (R-CBU-007 AC.3 — never a
   * hard-coded host). `contract` is the notified group's own
   * `agreement_id` — never a batch-wide or hard-coded value (R-RCU-007
   * AC.2). The `indicator` slug is byte-identical to the client's parser
   * (`results-center-url.codec.ts`) — this literal is one half of the
   * cross-package contract (design.md §8); no automated gate crosses that
   * boundary (D6).
   *
   * `source` scopes the view to the results this upload actually created.
   * The slug is derived, not hard-coded: the client builds its own source
   * vocabulary by lower-casing `platform_code`
   * (`results-center-url.vocabulary.ts` → `SOURCE_SLUG_TO_PLATFORM_CODE`),
   * so applying `.toLowerCase()` to `ReportingPlatformEnum.STAR` follows
   * the same rule from the same value rather than restating `'star'` as a
   * third spelling.
   *
   * **Scoping is intentional — confirmed by the product owner 2026-08-13.**
   * The recipient lands on STAR-platform results only. This is correct
   * because the CapDev bulk upload never creates results on any other
   * platform, so `source=star` describes exactly the set the email is about
   * ("the uploaded Capacity Development activities") and cannot hide any of
   * it. **Do not remove this parameter as an over-restriction** — it is a
   * settled decision, not an unresolved narrowing.
   */
  private buildStarLink(agreementId: string): string {
    const source = ReportingPlatformEnum.STAR.toLowerCase();
    return this.appConfig.COMPLETE_CLIENT_HOST(
      `/results-center?source=${source}&indicator=${QueryIndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT}&contract=${agreementId}`,
    );
  }

  private buildTemplateData(
    input: CapdevGroupSendInput,
  ): CapdevBulkEmailTemplateDto {
    const { tokenOwnerName, tokenOwnerEmail } = this.resolveTokenOwnerContact(
      input.tokenOwner,
    );
    return {
      projectLeadName: input.recipients.salutation,
      trainingsCount: input.metrics.trainingsCount,
      countries: input.metrics.countries,
      startDate: input.metrics.startDate,
      endDate: input.metrics.endDate,
      participantsCount: input.metrics.participantsCount,
      percentageWomen: input.metrics.percentageWomen,
      starLink: this.buildStarLink(input.agreementId),
      tokenOwnerName,
      tokenOwnerEmail,
    };
  }

  /**
   * Display name mirrors the recipients builder's tier-1 name cleaning
   * (`capdev-recipients.builder.ts` → `resolveSalutation`), falling back to
   * the bare email when both names are blank so the unguarded
   * `tokenOwnerName` slot is never empty for a resolved token owner. The
   * `tokenOwner` object itself is guaranteed present by the caller's type
   * (see `CapdevGroupSendInput.tokenOwner`); its individual `first_name` /
   * `last_name` / `email` columns stay nullable (`CapdevBulkTokenOwnerDto`),
   * which is what the optional-chaining below still guards against.
   */
  private resolveTokenOwnerContact(tokenOwner: CapdevBulkTokenOwnerDto): {
    tokenOwnerName: string;
    tokenOwnerEmail: string;
  } {
    const email = tokenOwner?.email?.trim() || '';
    const first = tokenOwner?.first_name?.trim()
      ? cleanName(tokenOwner.first_name)
      : '';
    const last = tokenOwner?.last_name?.trim()
      ? cleanName(tokenOwner.last_name)
      : '';
    const name = [first, last]
      .filter((part) => part && part.trim())
      .join(' ')
      .trim();

    return {
      tokenOwnerName: name || email,
      tokenOwnerEmail: email,
    };
  }
}
