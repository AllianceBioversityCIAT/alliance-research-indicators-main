import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TemplateService } from '../../../shared/auxiliar/template/template.service';
import { MessageMicroservice } from '../../../tools/broker/message.microservice';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { EnvAppConfigUtil } from '../../../shared/utils/env-app-config.util';
import {
  CapdevBulkNotificationService,
  CapdevGroupSendInput,
  CapdevGroupSendStatus,
  deriveNotificationStatus,
} from './capdev-bulk-notification.service';
import { CapdevBulkNotificationRepository } from './capdev-bulk-notification.repository';
import { formatCapdevMetrics } from './capdev-metrics.formatter';
import {
  CapdevBulkCountriesDto,
  CapdevBulkGroupDto,
  CapdevBulkMetricsDto,
  CapdevBulkTokenOwnerDto,
} from './dto/capdev-bulk-group.dto';
import { NotificationStatus } from './enum/notification-status.enum';
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

/**
 * Minimal mock repository — T-05's repository already has its own exhaustive
 * spec (`capdev-bulk-notification.repository.spec.ts`); `dispatch()`'s tests
 * only need to prove it calls the repository correctly, not re-verify the
 * repository's own SQL.
 */
function createRepositoryMock(): jest.Mocked<
  Pick<
    CapdevBulkNotificationRepository,
    | 'findGroups'
    | 'findMetrics'
    | 'findCountries'
    | 'findUnattributedResultIds'
    | 'countTotalResults'
    | 'persistProcessMetrics'
    | 'updateNotificationStatus'
  >
> {
  return {
    findGroups: jest
      .fn()
      .mockResolvedValue({ groups: [], multiPrimaryWarnings: [] }),
    findMetrics: jest.fn().mockResolvedValue([]),
    findCountries: jest.fn().mockResolvedValue([]),
    findUnattributedResultIds: jest.fn().mockResolvedValue([]),
    countTotalResults: jest.fn().mockResolvedValue(0),
    persistProcessMetrics: jest.fn().mockResolvedValue(undefined),
    updateNotificationStatus: jest.fn().mockResolvedValue(undefined),
  } as never;
}

/** Defaults to "enabled, no CC" — override per test via `overrides`. */
function createEnvAppConfigMock(
  overrides: {
    enabled?: { value: boolean; defaulted: boolean };
    cc?: { value: string[]; defaulted: boolean };
  } = {},
): jest.Mocked<
  Pick<
    EnvAppConfigUtil,
    'CAPDEV_BULK_UPLOAD_ENABLED' | 'CAPDEV_BULK_UPLOAD_CC_EMAIL'
  >
> {
  return {
    CAPDEV_BULK_UPLOAD_ENABLED: jest
      .fn()
      .mockResolvedValue(
        overrides.enabled ?? { value: true, defaulted: false },
      ),
    CAPDEV_BULK_UPLOAD_CC_EMAIL: jest
      .fn()
      .mockResolvedValue(overrides.cc ?? { value: [], defaulted: false }),
  } as never;
}

async function createService(
  templateRow: { template: string } | null,
  options: {
    repository?: ReturnType<typeof createRepositoryMock>;
    envAppConfig?: ReturnType<typeof createEnvAppConfigMock>;
  } = {},
) {
  const sendEmail = jest.fn().mockResolvedValue(undefined);
  const appConfig = {
    ARI_CLIENT_HOST: HOST,
    COMPLETE_CLIENT_HOST: (queryPath: string) => `${HOST}${queryPath}`,
  };
  const repository = options.repository ?? createRepositoryMock();
  const envAppConfig = options.envAppConfig ?? createEnvAppConfigMock();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CapdevBulkNotificationService,
      { provide: CapdevBulkNotificationRepository, useValue: repository },
      {
        provide: TemplateService,
        useValue: createTemplateService(templateRow),
      },
      { provide: MessageMicroservice, useValue: { sendEmail } },
      { provide: AppConfig, useValue: appConfig },
      { provide: EnvAppConfigUtil, useValue: envAppConfig },
    ],
  }).compile();

  const service = module.get<CapdevBulkNotificationService>(
    CapdevBulkNotificationService,
  );
  return { service, sendEmail, appConfig, repository, envAppConfig };
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

// ---------------------------------------------------------------------
// dispatch() fixtures (T-09)
// ---------------------------------------------------------------------

/** One Q1 group row — a resolvable PI and token owner by default. */
function makeGroup(
  overrides: Partial<CapdevBulkGroupDto> = {},
): CapdevBulkGroupDto {
  return {
    agreement_id: 'ABC-123',
    project_lead_description: null,
    pi: {
      carnet: 'C1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'pi@example.org',
    },
    ra: null,
    pa: null,
    token_owner: {
      sec_user_id: 1,
      first_name: 'Grace',
      last_name: 'Hopper',
      email: 'grace.hopper@example.org',
    },
    ...overrides,
  };
}

/** One Q2 metrics row for a given `agreement_id`. */
function makeMetricsRow(
  agreementId: string,
  overrides: Partial<CapdevBulkMetricsDto> = {},
): CapdevBulkMetricsDto {
  return {
    agreement_id: agreementId,
    trainings_count: 5,
    participants_total: 0,
    female_participants_total: 0,
    start_date: null,
    end_date: null,
    ...overrides,
  };
}

/** One Q3 countries row for a given `agreement_id`. */
function makeCountriesRow(
  agreementId: string,
  overrides: Partial<CapdevBulkCountriesDto> = {},
): CapdevBulkCountriesDto {
  return {
    agreement_id: agreementId,
    country_names: [],
    iso_alpha2_list: [],
    ...overrides,
  };
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
      // tasks.md T-09 advisory fold: a throw (plausibly a transient
      // DataSource error) must carry a distinguishing cause, separable in
      // logs from a genuinely missing/inactive row (R-CBU-011 AC.3).
      expect(errorSpy.mock.calls[0][0]).toContain('cause=TEMPLATE_QUERY_ERROR');
    });

    it('treats a present-but-empty template row identically to a throw for sendEmail/outcome, but logs a distinct cause', async () => {
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
      // The other half of the fold: an empty/undefined-but-present row is
      // NOT a query failure, so the cause must differ from the throw path
      // above.
      expect(errorSpy.mock.calls[0][0]).toContain(
        'cause=TEMPLATE_MISSING_OR_INACTIVE',
      );
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

  // -----------------------------------------------------------------------
  // deriveNotificationStatus — the single-source derivation table (T-09)
  // -----------------------------------------------------------------------
  describe('deriveNotificationStatus', () => {
    it.each`
      enabled  | groupCount | dispatchedCount | expected
      ${true}  | ${0}       | ${0}            | ${NotificationStatus.SKIPPED}
      ${false} | ${0}       | ${0}            | ${NotificationStatus.SKIPPED}
      ${false} | ${3}       | ${0}            | ${NotificationStatus.SKIPPED}
      ${true}  | ${3}       | ${3}            | ${NotificationStatus.SENT}
      ${true}  | ${3}       | ${0}            | ${NotificationStatus.FAILED}
      ${true}  | ${3}       | ${1}            | ${NotificationStatus.PARTIAL}
      ${true}  | ${3}       | ${2}            | ${NotificationStatus.PARTIAL}
      ${true}  | ${1}       | ${1}            | ${NotificationStatus.SENT}
    `(
      'enabled=$enabled groups=$groupCount dispatched=$dispatchedCount -> $expected',
      ({ enabled, groupCount, dispatchedCount, expected }) => {
        expect(
          deriveNotificationStatus(enabled, groupCount, dispatchedCount),
        ).toBe(expected);
      },
    );

    it('ignores the `enabled` value when groupCount is 0 (any flag state -> SKIPPED)', () => {
      expect(deriveNotificationStatus(true, 0, 0)).toBe(
        NotificationStatus.SKIPPED,
      );
      expect(deriveNotificationStatus(false, 0, 0)).toBe(
        NotificationStatus.SKIPPED,
      );
    });
  });

  // -----------------------------------------------------------------------
  // dispatch() — orchestration (T-09)
  // -----------------------------------------------------------------------
  describe('dispatch', () => {
    it('zero CapDev results: metrics are still written (a zero CapDev aggregate, but a real batch-wide total_results) and status is SKIPPED with a null sent_at, no email, flag never read', async () => {
      const repository = createRepositoryMock();
      // total_results is genuinely batch-wide (unfiltered by indicator or
      // contract) — a batch that produced zero CapDev groups can still have
      // created non-CapDev results, and this must not collapse to 0/null
      // just because there were no CapDev groups to fold over.
      repository.countTotalResults.mockResolvedValue(2);
      const { service, envAppConfig } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );

      await service.dispatch(42);

      expect(repository.persistProcessMetrics).toHaveBeenCalledWith(42, {
        total_results: 2,
        total_capdev_results: 0,
        total_participants: 0,
        total_female_participants: 0,
        activity_start_date: null,
        activity_end_date: null,
        countries: [],
      });
      expect(repository.updateNotificationStatus).toHaveBeenCalledWith(
        42,
        NotificationStatus.SKIPPED,
        null,
      );
      // "any / 0 / — / SKIPPED" — the flag is irrelevant when there is
      // nothing to dispatch; dispatch() must not even read it.
      expect(envAppConfig.CAPDEV_BULK_UPLOAD_ENABLED).not.toHaveBeenCalled();
    });

    it('Disqualifies-guard: flag false (present row) still writes metrics and persists SKIPPED — not just "zero sendEmail"', async () => {
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [makeGroup()],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([
        makeMetricsRow('ABC-123', { trainings_count: 12 }),
      ]);
      const envAppConfig = createEnvAppConfigMock({
        enabled: { value: false, defaulted: false },
      });
      const { service } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository, envAppConfig },
      );
      const sendSpy = jest.spyOn(service, 'sendGroupNotification');
      const warnSpy = jest.spyOn(
        (service as unknown as { logger: { _warn: jest.Mock } }).logger,
        '_warn',
      );

      await service.dispatch(9);

      // The write happened — this is the exact defect class this task's
      // Disqualifies clause names: a flag-off implementation that gates the
      // queries/write behind the flag would pass "zero sendEmail" while
      // failing this assertion.
      expect(repository.persistProcessMetrics).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ total_capdev_results: 12 }),
      );
      expect(repository.updateNotificationStatus).toHaveBeenCalledWith(
        9,
        NotificationStatus.SKIPPED,
        null,
      );
      expect(sendSpy).not.toHaveBeenCalled();
      // One warn: "feature disabled". The config row was present, so no
      // "config absent" warn — see the next test for that addition.
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('flag row absent: identical to flag=false, plus exactly one additional warn (config defaulted)', async () => {
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [makeGroup()],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([makeMetricsRow('ABC-123')]);
      const envAppConfig = createEnvAppConfigMock({
        enabled: { value: false, defaulted: true },
      });
      const { service } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository, envAppConfig },
      );
      const sendSpy = jest.spyOn(service, 'sendGroupNotification');
      const warnSpy = jest.spyOn(
        (service as unknown as { logger: { _warn: jest.Mock } }).logger,
        '_warn',
      );

      await service.dispatch(9);

      expect(repository.persistProcessMetrics).toHaveBeenCalled();
      expect(repository.updateNotificationStatus).toHaveBeenCalledWith(
        9,
        NotificationStatus.SKIPPED,
        null,
      );
      expect(sendSpy).not.toHaveBeenCalled();
      // "same + one warn" (tasks.md T-09 Tests): config-absent warn, plus
      // the feature-disabled warn every off-run gets.
      expect(warnSpy).toHaveBeenCalledTimes(2);
      const warnMessages = warnSpy.mock.calls.map(([msg]) => msg as string);
      expect(
        warnMessages.some((msg) =>
          msg.includes('EMAIL.CAPDEV_BULK_UPLOAD.ENABLED'),
        ),
      ).toBe(true);
    });

    it('all groups dispatch: status SENT, one info log per group with counts (never an address), a non-null sent_at', async () => {
      const group = makeGroup();
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [group],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([
        makeMetricsRow('ABC-123', { trainings_count: 12 }),
      ]);
      repository.findCountries.mockResolvedValue([
        makeCountriesRow('ABC-123', { iso_alpha2_list: ['KE', 'UG'] }),
      ]);
      const { service, repository: repo } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );
      jest.spyOn(service, 'sendGroupNotification').mockResolvedValue({
        status: CapdevGroupSendStatus.SENT,
        agreementId: 'ABC-123',
      });
      const logSpy = jest.spyOn(
        (service as unknown as { logger: { _log: jest.Mock } }).logger,
        '_log',
      );

      await service.dispatch(9);

      expect(repo.updateNotificationStatus).toHaveBeenCalledWith(
        9,
        NotificationStatus.SENT,
        expect.any(Date),
      );
      // NFR-CBU-003 — info logs carry counts, never an email address.
      const infoMessages = logSpy.mock.calls.map(([msg]) => msg as string);
      const sentLine = infoMessages.find((msg) =>
        msg.includes('Notification sent'),
      );
      expect(sentLine).toBeDefined();
      expect(sentLine).toContain('to=1');
      // No RA/PA/SPRM/configured CC in this fixture -> cc=0. The point of
      // this assertion is the mechanism (a real numeric count reaches the
      // log line), not this specific number.
      expect(sentLine).toContain('cc=0');
      expect(sentLine).toContain('trainings=12');
      expect(infoMessages.some((msg) => msg.includes('@'))).toBe(false);
    });

    it('R-CBU-008 AC.6 — the trainings count rendered into the real email body equals total_capdev_results persisted for the same run (no sendGroupNotification stub)', async () => {
      // Deliberately does NOT mock `sendGroupNotification` — it runs for
      // real, through the real on-disk template (KZ-001), so this proves
      // the emailed number and the persisted number actually agree for one
      // run, rather than being true only by construction because both read
      // the same `metricsByAgreementId` map (the exact gap both T-08
      // Reviewer lenses flagged one task ago).
      const group = makeGroup();
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [group],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([
        makeMetricsRow('ABC-123', { trainings_count: 12 }),
      ]);
      repository.findCountries.mockResolvedValue([
        makeCountriesRow('ABC-123', {
          country_names: ['Kenya'],
          iso_alpha2_list: ['KE'],
        }),
      ]);
      const {
        service,
        sendEmail,
        repository: repo,
      } = await createService({ template: REAL_TEMPLATE_HTML }, { repository });

      await service.dispatch(9);

      expect(sendEmail).toHaveBeenCalledTimes(1);
      const body = extractBody(sendEmail);
      expect(body).not.toContain('{{');

      const persistedAggregate = repo.persistProcessMetrics.mock
        .calls[0][1] as { total_capdev_results: number };
      expect(persistedAggregate.total_capdev_results).toBe(12);
      // The real template's exact phrasing ("The records encompass
      // {{trainingsCount}} trainings conducted...") — asserting against the
      // persisted value, not the literal `12`, is what makes this a
      // same-run agreement check rather than two independent assertions
      // that happen to match.
      expect(body).toContain(
        `The records encompass ${persistedAggregate.total_capdev_results} trainings`,
      );
    });

    it('group 1 throws, group 2 still dispatches: exactly one error log for the failure, status PARTIAL', async () => {
      const groupA = makeGroup({ agreement_id: 'A' });
      const groupB = makeGroup({ agreement_id: 'B' });
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [groupA, groupB],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([
        makeMetricsRow('A'),
        makeMetricsRow('B'),
      ]);
      const { service, repository: repo } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );
      jest
        .spyOn(service, 'sendGroupNotification')
        .mockRejectedValueOnce(new Error('broker unreachable'))
        .mockResolvedValueOnce({
          status: CapdevGroupSendStatus.SENT,
          agreementId: 'B',
        });
      const errorSpy = jest.spyOn(
        (service as unknown as { logger: { _error: jest.Mock } }).logger,
        '_error',
      );

      await service.dispatch(9);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain('agreement_id=A');
      expect(repo.updateNotificationStatus).toHaveBeenCalledWith(
        9,
        NotificationStatus.PARTIAL,
        expect.any(Date),
      );
    });

    it('unresolvable PI skips only that group (warn, reason=NO_PI); the other group still dispatches -> PARTIAL', async () => {
      const unresolvable = makeGroup({
        agreement_id: 'A',
        pi: { carnet: 'C9', first_name: null, last_name: null, email: null },
      });
      const resolvable = makeGroup({ agreement_id: 'B' });
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [unresolvable, resolvable],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([
        makeMetricsRow('A'),
        makeMetricsRow('B'),
      ]);
      const { service, repository: repo } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );
      const sendSpy = jest
        .spyOn(service, 'sendGroupNotification')
        .mockResolvedValue({
          status: CapdevGroupSendStatus.SENT,
          agreementId: 'B',
        });
      const warnSpy = jest.spyOn(
        (service as unknown as { logger: { _warn: jest.Mock } }).logger,
        '_warn',
      );

      await service.dispatch(9);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({ agreementId: 'B' }),
      );
      expect(
        warnSpy.mock.calls.some(
          ([msg]) =>
            (msg as string).includes('agreement_id=A') &&
            (msg as string).includes('reason=NO_PI'),
        ),
      ).toBe(true);
      expect(repo.updateNotificationStatus).toHaveBeenCalledWith(
        9,
        NotificationStatus.PARTIAL,
        expect.any(Date),
      );
    });

    it('a null token owner skips that group with an error log (invariant violation) and counts it as not dispatched; the other group still dispatches', async () => {
      const brokenInvariant = makeGroup({
        agreement_id: 'A',
        token_owner: null,
      });
      const healthy = makeGroup({ agreement_id: 'B' });
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [brokenInvariant, healthy],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([
        makeMetricsRow('A'),
        makeMetricsRow('B'),
      ]);
      const { service, repository: repo } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );
      const sendSpy = jest
        .spyOn(service, 'sendGroupNotification')
        .mockResolvedValue({
          status: CapdevGroupSendStatus.SENT,
          agreementId: 'B',
        });
      const errorSpy = jest.spyOn(
        (service as unknown as { logger: { _error: jest.Mock } }).logger,
        '_error',
      );

      await service.dispatch(9);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({ agreementId: 'B' }),
      );
      // Error level, not warn — design.md §6.1 declares this unreachable,
      // so reaching it means the created_by invariant broke.
      expect(
        errorSpy.mock.calls.some(([msg]) =>
          (msg as string).includes('Token owner unresolved for agreement_id=A'),
        ),
      ).toBe(true);
      expect(repo.updateNotificationStatus).toHaveBeenCalledWith(
        9,
        NotificationStatus.PARTIAL,
        expect.any(Date),
      );
    });

    it('every group fails to dispatch (flag on, groups > 0, dispatched = 0) -> FAILED', async () => {
      const unresolvable = makeGroup({
        agreement_id: 'A',
        pi: { carnet: 'C9', first_name: null, last_name: null, email: null },
      });
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [unresolvable],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([makeMetricsRow('A')]);
      const { service, repository: repo } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );

      await service.dispatch(9);

      expect(repo.updateNotificationStatus).toHaveBeenCalledWith(
        9,
        NotificationStatus.FAILED,
        null,
      );
    });

    it('logs the unattributed result_id list (not a scalar count) at warn level', async () => {
      const repository = createRepositoryMock();
      repository.findUnattributedResultIds.mockResolvedValue([501, 502]);
      const { service } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );
      const warnSpy = jest.spyOn(
        (service as unknown as { logger: { _warn: jest.Mock } }).logger,
        '_warn',
      );

      await service.dispatch(9);

      expect(
        warnSpy.mock.calls.some(
          ([msg]) =>
            (msg as string).includes('result_id=[501, 502]') &&
            (msg as string).includes('bulk_upload_process_id=9'),
        ),
      ).toBe(true);
    });

    it('passes fileContacts through to the recipients builder (contract-scoped CC reaches only its group)', async () => {
      const group = makeGroup();
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [group],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([makeMetricsRow('ABC-123')]);
      const { service } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );
      const sendSpy = jest
        .spyOn(service, 'sendGroupNotification')
        .mockResolvedValue({
          status: CapdevGroupSendStatus.SENT,
          agreementId: 'ABC-123',
        });

      await service.dispatch(9, [
        { email: 'reporting-leader@example.org', contract_code: 'ABC-123' },
      ]);

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: expect.objectContaining({
            cc: expect.arrayContaining(['reporting-leader@example.org']),
          }),
        }),
      );
    });
  });
});
