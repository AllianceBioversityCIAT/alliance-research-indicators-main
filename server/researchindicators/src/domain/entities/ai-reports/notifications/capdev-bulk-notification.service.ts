import { Injectable } from '@nestjs/common';
import { TemplateService } from '../../../shared/auxiliar/template/template.service';
import { TemplateEnum } from '../../../shared/auxiliar/template/enum/template.enum';
import { MessageMicroservice } from '../../../tools/broker/message.microservice';
import { EmailBody } from '../../../tools/broker/dto/mailer.dto';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { cleanName } from '../../../shared/utils/object.utils';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import {
  CapdevBulkEmailTemplateDto,
  CapdevMetricsTemplateFields,
} from './dto/capdev-bulk-email-template.dto';
import { CapdevBulkTokenOwnerDto } from './dto/capdev-bulk-group.dto';
import { CapdevRecipients } from './capdev-recipients.builder';

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
 * Query-string stance for design.md §15 Q1 (open, non-blocking): preselects
 * the CapDev indicator tab on `results-center`. A wrong query string
 * degrades to a correct page rather than a broken link, so this is not
 * treated as load-bearing.
 */
const CAPDEV_INDICATOR_TAB_QUERY = `indicatorTab=${IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT}`;

/**
 * The assembly half of the CapDev bulk-upload notification stage
 * (design.md §2.1, §6.2; requirements.md R-CBU-007, NFR-CBU-003).
 *
 * **Scope boundary (binding, tasks.md T-08 / T-09):** this class currently
 * implements only {@link sendGroupNotification} — the per-group build +
 * render + dispatch. It does **not** implement `dispatch()`, the repository
 * calls, the feature-flag gate, metric persistence, the per-group loop, or
 * the aggregate `notification_status` write; those are T-09. It is also not
 * yet registered in `ai-reports.module.ts` — T-09 wires it in.
 *
 * **Failure containment is split by design.** `sendGroupNotification` never
 * throws for a missing template — that branch is internal and returns
 * {@link CapdevGroupSendStatus.NO_TEMPLATE}. It deliberately does **not**
 * catch a `MessageMicroservice.sendEmail` rejection or any other unexpected
 * error: design.md §6.6's per-group `try/catch` is T-09's orchestration
 * responsibility, and letting a real send failure propagate is what lets
 * that catch log the "group failed" error line (design.md §10) without this
 * method also logging it — R-CBU-010 AC.5 requires exactly one error log per
 * caught failure, not one per layer.
 */
@Injectable()
export class CapdevBulkNotificationService {
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: CapdevBulkNotificationService.name,
  });

  constructor(
    private readonly templateService: TemplateService,
    private readonly messageMicroservice: MessageMicroservice,
    private readonly appConfig: AppConfig,
  ) {}

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
    const html = await this.safeGetTemplate(templateData);

    if (!html) {
      this.logger._error(
        `No active template for key="${TemplateEnum.CAPDEV_BULK_UPLOAD_SUMMARY}" — ` +
          `notification skipped for agreement_id=${input.agreementId} ` +
          `(bulk_upload_process_id=${input.processId})`,
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
   */
  private async safeGetTemplate(
    data: CapdevBulkEmailTemplateDto,
  ): Promise<string | null> {
    try {
      const rendered =
        await this.templateService._getTemplate<CapdevBulkEmailTemplateDto>(
          TemplateEnum.CAPDEV_BULK_UPLOAD_SUMMARY,
          data,
        );
      return rendered ? rendered : null;
    } catch {
      return null;
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
   * `{AppConfig.ARI_CLIENT_HOST}/results-center` + the CapDev tab query
   * string, via the existing `COMPLETE_CLIENT_HOST` helper
   * (`app-config.util.ts`) rather than string-concatenating the host by
   * hand (R-CBU-007 AC.3 — never a hard-coded host).
   */
  private buildStarLink(): string {
    return this.appConfig.COMPLETE_CLIENT_HOST(
      `/results-center?${CAPDEV_INDICATOR_TAB_QUERY}`,
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
      starLink: this.buildStarLink(),
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
