import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TemplateService } from '../../../shared/auxiliar/template/template.service';
import { MessageMicroservice } from '../../../tools/broker/message.microservice';
import { AppConfig } from '../../../shared/utils/app-config.util';
import {
  CapdevBulkNotificationService,
  CapdevGroupSendInput,
  CapdevGroupSendStatus,
} from './capdev-bulk-notification.service';
import { formatCapdevMetrics } from './capdev-metrics.formatter';
import {
  CapdevBulkMetricsDto,
  CapdevBulkTokenOwnerDto,
} from './dto/capdev-bulk-group.dto';
import { CapdevRecipients } from './capdev-recipients.builder';

/**
 * KZ-001 guard: the real on-disk template, compiled through the real
 * `TemplateService` + Handlebars — never a `template: ''` stub. A stub makes
 * "no `{{` remaining" and "no `NaN`" pass vacuously, which is exactly the
 * failure mode KZ-001 records (tasks.md T-08 Disqualifies).
 */
const TEMPLATE_HTML_PATH = path.join(
  __dirname,
  '../../../shared/auxiliar/template/template/capdev-bulk-summary.html',
);
const REAL_TEMPLATE_HTML = fs.readFileSync(TEMPLATE_HTML_PATH, 'utf-8');

const HOST = 'https://ari.example.org';

/**
 * Real `TemplateService` backed by a mocked `DataSource`. `templateRow: null`
 * reproduces the actual bug being guarded against (`template.service.ts`
 * destructures `{ template }` from `findOne(...)`'s result, which throws a
 * `TypeError` when no active row matches — it does not resolve falsy).
 */
function createTemplateService(
  templateRow: { template: string } | null,
): TemplateService {
  const dataSource = {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(templateRow),
    }),
  } as unknown as DataSource;
  return new TemplateService(dataSource);
}

async function createService(templateRow: { template: string } | null) {
  const sendEmail = jest.fn().mockResolvedValue(undefined);
  const appConfig = {
    ARI_CLIENT_HOST: HOST,
    COMPLETE_CLIENT_HOST: (queryPath: string) => `${HOST}${queryPath}`,
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CapdevBulkNotificationService,
      {
        provide: TemplateService,
        useValue: createTemplateService(templateRow),
      },
      { provide: MessageMicroservice, useValue: { sendEmail } },
      { provide: AppConfig, useValue: appConfig },
    ],
  }).compile();

  const service = module.get<CapdevBulkNotificationService>(
    CapdevBulkNotificationService,
  );
  return { service, sendEmail, appConfig };
}

const RECIPIENTS: CapdevRecipients = {
  to: ['pi@example.org'],
  cc: ['ra@example.org', 'sprm@example.org'],
  salutation: 'Ada Lovelace',
};

const TOKEN_OWNER: CapdevBulkTokenOwnerDto = {
  sec_user_id: 1,
  first_name: 'Grace',
  last_name: 'Hopper',
  email: 'grace.hopper@example.org',
};

/** Real T-07 formatter — never hand-written `percentageWomen` (T-08 Blocking). */
function metricsFor(
  raw: Partial<CapdevBulkMetricsDto>,
  countryNames: string[] | null,
) {
  const metrics: CapdevBulkMetricsDto = {
    agreement_id: 'ABC-123',
    trainings_count: 12,
    participants_total: 0,
    female_participants_total: 0,
    start_date: null,
    end_date: null,
    ...raw,
  };
  return formatCapdevMetrics(metrics, countryNames);
}

function buildInput(
  overrides: Partial<CapdevGroupSendInput> = {},
): CapdevGroupSendInput {
  return {
    processId: 42,
    agreementId: 'ABC-123',
    metrics: metricsFor({}, ['Kenya', 'Uganda']),
    recipients: RECIPIENTS,
    tokenOwner: TOKEN_OWNER,
    ...overrides,
  };
}

/** Extracts the rendered HTML body from the `sendEmail` call's `EmailBody`. */
function extractBody(sendEmail: jest.Mock): string {
  const emailBody = sendEmail.mock.calls[0][0];
  return (emailBody.message.socketFile as Buffer).toString('utf-8');
}

describe('CapdevBulkNotificationService', () => {
  it('should be defined', async () => {
    const { service } = await createService({ template: REAL_TEMPLATE_HTML });
    expect(service).toBeDefined();
  });

  describe('sendGroupNotification — happy path', () => {
    it('renders the real template with no unresolved tokens, the correct subject, STAR link, and token-owner contact; sends via socketFile only', async () => {
      const { service, sendEmail } = await createService({
        template: REAL_TEMPLATE_HTML,
      });
      const input = buildInput({
        metrics: metricsFor(
          {
            participants_total: 1204,
            female_participants_total: 700,
            start_date: new Date('2025-03-01T00:00:00Z'),
            end_date: new Date('2025-06-01T00:00:00Z'),
          },
          ['Kenya', 'Uganda'],
        ),
      });

      const outcome = await service.sendGroupNotification(input);

      expect(outcome).toEqual({
        status: CapdevGroupSendStatus.SENT,
        agreementId: 'ABC-123',
      });
      expect(sendEmail).toHaveBeenCalledTimes(1);

      const emailBody = sendEmail.mock.calls[0][0];
      const body = extractBody(sendEmail);

      // R-CBU-007 AC.1 — no unsubstituted Handlebars token.
      expect(body).not.toContain('{{');

      // R-CBU-007 AC.2 — subject begins `[<agreement_id>]`.
      expect(emailBody.subject.startsWith('[ABC-123]')).toBe(true);
      expect(emailBody.subject).toBe(
        '[ABC-123] Training Results Successfully Recorded in the Alliance Institutional Reporting System',
      );

      // R-CBU-007 AC.3 — link resolves against ARI_CLIENT_HOST, never hard-coded.
      const hrefMatch = body.match(/href="([^"]+)"/);
      expect(hrefMatch?.[1]?.startsWith(HOST)).toBe(true);

      // R-CBU-007 AC.4 — token owner name + email in the contact sentence.
      expect(body).toContain('Grace Hopper');
      expect(body).toContain('grace.hopper@example.org');

      // Salutation — proves `projectLeadName` actually reached the render,
      // not just that no `{{` remained (a mutation-only guard: an empty or
      // swapped `projectLeadName` would still leave zero `{{` behind).
      expect(body).toContain('Dear Ada Lovelace,');

      // Date range — same mutation-only guard as above, for `startDate`/
      // `endDate`: a swap or drop renders empty strings, which `not.toContain('{{')`
      // cannot catch.
      expect(body).toContain('during the period from March 2025 to June 2025');

      // D-OD2-d — closes the render-layer gap for the `p >= 1` branch. The
      // `<1%` floor is covered by a dedicated test below; this is the other
      // half: 700 of 1,204 rounds to 58%, and the `%` sign must survive to
      // the rendered body (it lives in the formatter's output string, not
      // the template — design.md §6.5/D-OD2-b). Dropping it in the
      // formatter (`capdev-metrics.formatter.ts:94`) leaves every other
      // assertion in this file green; only this one goes red.
      expect(body).toContain('— 58% of whom were women');

      // NFR-CBU-003 — no participant-level personal data.
      expect(body).not.toContain('trainee_name');

      // design.md §2.2 / JD-S4 — socketFile Buffer, never `text`.
      expect(emailBody.message.text).toBeUndefined();
      expect(emailBody.message.socketFile).toBeInstanceOf(Buffer);
      expect(emailBody.to).toEqual(['pi@example.org']);
      expect(emailBody.cc).toEqual(RECIPIENTS.cc);
    });

    it('falls back to the bare email for the token-owner contact sentence when no name is resolvable', async () => {
      const { service, sendEmail } = await createService({
        template: REAL_TEMPLATE_HTML,
      });
      const input = buildInput({
        tokenOwner: {
          sec_user_id: 2,
          first_name: null,
          last_name: null,
          email: 'owner@example.org',
        },
      });

      await service.sendGroupNotification(input);

      const body = extractBody(sendEmail);
      expect(body).toContain('owner@example.org');
    });
  });

  describe('sendGroupNotification — missing/inactive template (NO_TEMPLATE)', () => {
    it('treats a `findOne`-throw (no active row) as NO_TEMPLATE: zero sendEmail calls, exactly one error log', async () => {
      const { service, sendEmail } = await createService(null);
      const errorSpy = jest.spyOn(
        (service as unknown as { logger: { _error: jest.Mock } }).logger,
        '_error',
      );

      const outcome = await service.sendGroupNotification(buildInput());

      expect(outcome).toEqual({
        status: CapdevGroupSendStatus.NO_TEMPLATE,
        agreementId: 'ABC-123',
      });
      expect(sendEmail).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('treats a present-but-empty template row identically to a throw', async () => {
      const { service, sendEmail } = await createService({ template: '' });
      const errorSpy = jest.spyOn(
        (service as unknown as { logger: { _error: jest.Mock } }).logger,
        '_error',
      );

      const outcome = await service.sendGroupNotification(buildInput());

      expect(outcome).toEqual({
        status: CapdevGroupSendStatus.NO_TEMPLATE,
        agreementId: 'ABC-123',
      });
      expect(sendEmail).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendGroupNotification — OD-2 women-percentage rendering (BLOCKING)', () => {
    it('renders the HTML-escaped floor clause for a non-zero sub-1% women share, never a bare "0%"', async () => {
      const { service, sendEmail } = await createService({
        template: REAL_TEMPLATE_HTML,
      });
      const input = buildInput({
        // 4 of 1,240 — R-CBU-006 AC.7's own example.
        metrics: metricsFor(
          { participants_total: 1240, female_participants_total: 4 },
          ['Kenya'],
        ),
      });

      await service.sendGroupNotification(input);

      const body = extractBody(sendEmail);
      // {{percentageWomen}} is a double-stache: Handlebars escapes `<` to
      // `&lt;`. Asserting the raw `<1%` would fail against a *correct*
      // template (D-OD2-c) — do not "fix" this by switching to a triple
      // stache.
      expect(body).toContain('— &lt;1% of whom were women');
      expect(body).not.toContain('0%');
    });

    it('renders the participants clause with no women clause at all when the female count is exactly 0', async () => {
      const { service, sendEmail } = await createService({
        template: REAL_TEMPLATE_HTML,
      });
      const input = buildInput({
        metrics: metricsFor(
          { participants_total: 100, female_participants_total: 0 },
          ['Kenya'],
        ),
      });

      await service.sendGroupNotification(input);

      const body = extractBody(sendEmail);
      expect(body).toContain('100 participants took part');
      // Scoped to the numeric form — a bare `not.toContain('%')` would break
      // spuriously on an unrelated `%` in the template (e.g. a `width: 100%`
      // style rule) with a failure message pointing nowhere near the cause.
      // The neighbouring assertion below already carries the semantic.
      expect(body).not.toMatch(/\d+%|<1%/);
      expect(body).not.toContain('of whom were women');
    });
  });

  describe('sendGroupNotification — OD-1 degenerate scenario (BLOCKING)', () => {
    it('renders the "across multiple countries" fallback and no degenerate tokens for a group with no participants, dates, or countries', async () => {
      const { service, sendEmail } = await createService({
        template: REAL_TEMPLATE_HTML,
      });
      const input = buildInput({
        metrics: metricsFor(
          {
            trainings_count: 3,
            participants_total: 0,
            female_participants_total: 0,
            start_date: null,
            end_date: null,
          },
          [],
        ),
      });

      await service.sendGroupNotification(input);

      const body = extractBody(sendEmail);
      expect(body).toContain(
        'The records encompass 3 trainings conducted across multiple countries.',
      );
      expect(body).not.toMatch(/NaN|Infinity|null|undefined|Invalid Date/);
      expect(body).not.toContain('{{');
    });
  });
});
