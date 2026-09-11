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
 * A **real** `TemplateService` (real Handlebars, real `_getTemplate`
 * control flow) backed by a `findOne` sequenced per call — one entry per
 * call to `_getTemplate`, in order. This is what makes a per-group
 * `dispatch()` test differentiate group A from group B without stubbing
 * `_getTemplate` itself (Leader fold 3, KZ-001): a `_getTemplate` stub would
 * make group B's `sendEmail` receive the *fake* return value verbatim,
 * never running it through real Handlebars — "no `{{` remaining" would then
 * be true only because nothing was ever templated, not because rendering
 * succeeded.
 *
 * Each entry is either a `{ template }` row (found) or an `Error` (the
 * `findOne`-throws branch — `template.service.ts`'s destructure of a `null`
 * result).
 */
function createSequencedTemplateService(
  entries: Array<{ template: string } | null | Error>,
): TemplateService {
  const findOne = jest.fn();
  for (const entry of entries) {
    if (entry instanceof Error) {
      findOne.mockRejectedValueOnce(entry);
    } else {
      findOne.mockResolvedValueOnce(entry);
    }
  }
  const dataSource = {
    getRepository: jest.fn().mockReturnValue({ findOne }),
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
    /**
     * T-12: a **real** `TemplateService` (e.g. from
     * {@link createSequencedTemplateService}) that drives `_getTemplate`
     * per-call — group A missing/erroring, group B present — rather than
     * the fixed-per-instance `createTemplateService(templateRow)`. Always a
     * real instance (KZ-001: never a `{ _getTemplate: jest.fn() }` stub, or
     * a "real Handlebars" claim elsewhere in this file would be false for
     * whichever group used it). Ignored — and `templateRow` used instead —
     * when omitted.
     */
    templateService?: TemplateService;
  } = {},
) {
  const sendEmail = jest.fn().mockResolvedValue(undefined);
  const appConfig = {
    ARI_CLIENT_HOST: HOST,
    COMPLETE_CLIENT_HOST: (queryPath: string) => `${HOST}${queryPath}`,
  };
  const repository = options.repository ?? createRepositoryMock();
  const envAppConfig = options.envAppConfig ?? createEnvAppConfigMock();
  const templateService =
    options.templateService ?? createTemplateService(templateRow);

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CapdevBulkNotificationService,
      { provide: CapdevBulkNotificationRepository, useValue: repository },
      {
        provide: TemplateService,
        useValue: templateService,
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
  dropped: [],
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

  // -----------------------------------------------------------------------
  // R-RCU-007 AC.2/AC.3, defect class D6 — the STAR link (`buildStarLink`)
  //
  // KZ-004: a fixture whose units share one `agreementId` cannot prove
  // per-unit scoping. Every case below drives at least two groups with
  // DIFFERENT agreement ids so a batch-wide-or-hard-coded regression turns
  // this red rather than passing vacuously.
  // -----------------------------------------------------------------------
  describe('sendGroupNotification — STAR link (R-RCU-007, D6)', () => {
    it("carries the notified group's own agreement_id in `contract` — never a batch-wide or hard-coded value — for two groups with different ids", async () => {
      const { service, sendEmail } = await createService({
        template: REAL_TEMPLATE_HTML,
      });

      await service.sendGroupNotification(buildInput({ agreementId: 'A100' }));
      await service.sendGroupNotification(buildInput({ agreementId: 'B200' }));

      const hrefOf = (callIndex: number) => {
        const body = (
          sendEmail.mock.calls[callIndex][0].message.socketFile as Buffer
        ).toString('utf-8');
        return body.match(/href="([^"]+)"/)?.[1];
      };

      expect(hrefOf(0)).toBe(
        `${HOST}/results-center?source=star&indicator=capacity-sharing-for-development&contract=A100`,
      );
      expect(hrefOf(1)).toBe(
        `${HOST}/results-center?source=star&indicator=capacity-sharing-for-development&contract=B200`,
      );
    });

    // design.md §8 cross-package contract / tasks.md T-10 — the exact
    // literal, not a `.toContain('results-center')` presence check, which
    // cannot detect a spelling drift on either side (Disqualifies clause).
    // This literal is byte-identical to the one asserted in the client's
    // `results-center-url.codec.spec.ts` (T-02).
    it('emits the exact literal `/results-center?source=star&indicator=capacity-sharing-for-development&contract=A100` required by the cross-package contract (design.md §8)', async () => {
      const { service, sendEmail } = await createService({
        template: REAL_TEMPLATE_HTML,
      });

      await service.sendGroupNotification(buildInput({ agreementId: 'A100' }));

      const body = extractBody(sendEmail);
      const href = body.match(/href="([^"]+)"/)?.[1];

      expect(href).toBe(
        `${HOST}/results-center?source=star&indicator=capacity-sharing-for-development&contract=A100`,
      );
    });

    it('never emits `indicatorTab` (the retired query key)', async () => {
      const { service, sendEmail } = await createService({
        template: REAL_TEMPLATE_HTML,
      });

      await service.sendGroupNotification(buildInput({ agreementId: 'A100' }));

      const body = extractBody(sendEmail);
      expect(body).not.toContain('indicatorTab');
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
    it('zero eligible attributed CapDev (e.g. draft-only batch): metrics still written with zero CapDev aggregates, batch-wide total_results preserved, SKIPPED, no email', async () => {
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

    it('R-CESF-004 scenario — eligible but unattributed only: zero groups, warn lists ids, CapDev metrics zero, SKIPPED, no email', async () => {
      const repository = createRepositoryMock();
      repository.findUnattributedResultIds.mockResolvedValue([101, 102]);
      repository.countTotalResults.mockResolvedValue(2);
      const { service } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );
      const sendSpy = jest.spyOn(service, 'sendGroupNotification');
      const warnSpy = jest.spyOn(
        (service as unknown as { logger: { _warn: jest.Mock } }).logger,
        '_warn',
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
      expect(sendSpy).not.toHaveBeenCalled();
      expect(
        warnSpy.mock.calls.some(([msg]) =>
          (msg as string).includes('result_id=[101, 102]'),
        ),
      ).toBe(true);
    });

    it('R-CESF-002/004 — pre-filtered repository mocks: CapDev persist reflects eligible-only metrics while total_results stays batch-wide', async () => {
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [makeGroup({ agreement_id: 'ABC-123' })],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([
        makeMetricsRow('ABC-123', {
          trainings_count: 2,
          participants_total: 20,
          female_participants_total: 8,
        }),
      ]);
      repository.countTotalResults.mockResolvedValue(5);
      const { service } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );

      await service.dispatch(11);

      expect(repository.persistProcessMetrics).toHaveBeenCalledWith(
        11,
        expect.objectContaining({
          total_capdev_results: 2,
          total_participants: 20,
          total_female_participants: 8,
          total_results: 5,
        }),
      );
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

  // -----------------------------------------------------------------------
  // T-12 — failure-isolation and data-minimisation sweep
  // -----------------------------------------------------------------------
  describe('T-12 — R-CBU-010 "Broker down" scenario, end to end', () => {
    it('RabbitMQ unreachable (sendEmail throws): metrics still persisted (not rolled back), notification_status FAILED, exactly one ERROR-level log carrying the bulk process id, no info-level address, no trainee_name in the rendered-but-undelivered body', async () => {
      const group = makeGroup();
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [group],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([
        makeMetricsRow('ABC-123', { trainings_count: 40 }),
      ]);
      const {
        service,
        sendEmail,
        repository: repo,
      } = await createService({ template: REAL_TEMPLATE_HTML }, { repository });
      // Real sendGroupNotification runs end to end (KZ-001) — the template
      // renders for real before the broker call is attempted and fails;
      // only the transport (MessageMicroservice.sendEmail) is faked.
      sendEmail.mockRejectedValueOnce(
        new Error('ECONNREFUSED: RabbitMQ unreachable'),
      );
      const errorSpy = jest.spyOn(
        (service as unknown as { logger: { _error: jest.Mock } }).logger,
        '_error',
      );
      const warnSpy = jest.spyOn(
        (service as unknown as { logger: { _warn: jest.Mock } }).logger,
        '_warn',
      );
      const logSpy = jest.spyOn(
        (service as unknown as { logger: { _log: jest.Mock } }).logger,
        '_log',
      );

      await service.dispatch(9);

      // Metrics are the same values the (failed) email would have carried —
      // a broker outage must not roll back or withhold the persisted
      // aggregate (R-CBU-008, R-CBU-010 "Broker down" scenario).
      expect(repo.persistProcessMetrics).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ total_capdev_results: 40 }),
      );
      expect(repo.updateNotificationStatus).toHaveBeenCalledWith(
        9,
        NotificationStatus.FAILED,
        null,
      );

      // Disqualifies clause: binds to the specific method (`_error`), not
      // merely "a log fired" — a spy asserting only call count cannot tell
      // an error from a warning or an info line apart.
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain('bulk_upload_process_id=9');
      expect(errorSpy.mock.calls[0][0]).toContain('agreement_id=ABC-123');
      // The failure is real: nothing else silently escalated to error, and
      // no group was ever reported as sent.
      expect(warnSpy).not.toHaveBeenCalled();
      const infoMessages = logSpy.mock.calls.map(([msg]) => msg as string);
      expect(
        infoMessages.some((msg) => msg.includes('Notification sent')),
      ).toBe(false);
      // NFR-CBU-003 / R-CBU-011 AC.2 — no address at info level, even on
      // the failure path.
      expect(infoMessages.some((msg) => msg.includes('@'))).toBe(false);

      // NFR-CBU-003 — the body was rendered (and captured by the mock's
      // call args) before the broker call failed; it must still carry no
      // participant-level PII, on a failure path as much as the happy one.
      const renderedBody = (
        sendEmail.mock.calls[0][0].message.socketFile as Buffer
      ).toString('utf-8');
      expect(renderedBody).not.toContain('trainee_name');
    });
  });

  describe('T-12 — per-group isolation under three distinct failure modes', () => {
    it("mode 1 (send throws): group A's sendEmail rejects, group B still dispatches — exactly one error log, naming A, at error level", async () => {
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
      const {
        service,
        sendEmail,
        repository: repo,
      } = await createService({ template: REAL_TEMPLATE_HTML }, { repository });
      sendEmail
        .mockRejectedValueOnce(new Error('broker unreachable'))
        .mockResolvedValueOnce(undefined);
      const errorSpy = jest.spyOn(
        (service as unknown as { logger: { _error: jest.Mock } }).logger,
        '_error',
      );
      const logSpy = jest.spyOn(
        (service as unknown as { logger: { _log: jest.Mock } }).logger,
        '_log',
      );

      await service.dispatch(9);

      expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain('agreement_id=A');
      expect(errorSpy.mock.calls[0][0]).toContain('bulk_upload_process_id=9');

      const infoMessages = logSpy.mock.calls.map(([msg]) => msg as string);
      const sentLine = infoMessages.find((msg) =>
        msg.includes('Notification sent'),
      );
      expect(sentLine).toBeDefined();
      expect(sentLine).toContain('agreement_id=B');

      expect(repo.updateNotificationStatus).toHaveBeenCalledWith(
        9,
        NotificationStatus.PARTIAL,
        expect.any(Date),
      );
    });

    it('mode 2 (metric query throws): findMetrics fails for the whole batch — this is the OUTER boundary (design.md §6.6 "two nested boundaries"), not per-group isolation, since the four grouped reads run before the per-group loop and before the persistence write; it propagates out of dispatch() itself and neither write occurs', async () => {
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [makeGroup()],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockRejectedValue(new Error('ER_QUERY_TIMEOUT'));
      const { service, repository: repo } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );

      // No per-group boundary exists yet at this point in dispatch() —
      // ResultsService's outer try/catch (results.service.spec.ts) is what
      // contains this, exactly as design.md §6.6 describes: "Outer — the
      // whole dispatch() call is wrapped in ResultsService."
      await expect(service.dispatch(9)).rejects.toThrow('ER_QUERY_TIMEOUT');

      expect(repo.persistProcessMetrics).not.toHaveBeenCalled();
      expect(repo.updateNotificationStatus).not.toHaveBeenCalled();
    });

    it("mode 3 (template query throws): group A's template lookup rejects, group B's resolves and renders for real through Handlebars — group B still dispatches, exactly one error log naming A at cause=TEMPLATE_QUERY_ERROR", async () => {
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
      // Leader fold 3 (conformance lens, KZ-001): a real `TemplateService` +
      // real Handlebars throughout, never a `_getTemplate` stub — the
      // previous version of this test replaced `_getTemplate` itself, so
      // group B's `sendEmail` received the fixture string verbatim,
      // unrendered. A `_getTemplate` stub makes "no `{{` remaining" true
      // for the wrong reason (nothing was ever templated), which is exactly
      // KZ-001's shape. This also closes on the one genuine *per-group query
      // failure* the shipped architecture actually has (see the mode-2 test
      // above for why the batch-wide metric query is architecturally not
      // per-group): group A's `findOne` rejects with a transient
      // DataSource-shaped error, group B's resolves the real seeded HTML.
      const templateService = createSequencedTemplateService([
        new Error('ER_QUERY_TIMEOUT'),
        { template: REAL_TEMPLATE_HTML },
      ]);
      const {
        service,
        sendEmail,
        repository: repo,
      } = await createService(null, { repository, templateService });
      const errorSpy = jest.spyOn(
        (service as unknown as { logger: { _error: jest.Mock } }).logger,
        '_error',
      );
      const logSpy = jest.spyOn(
        (service as unknown as { logger: { _log: jest.Mock } }).logger,
        '_log',
      );

      await service.dispatch(9);

      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain('agreement_id=A');
      expect(errorSpy.mock.calls[0][0]).toContain('cause=TEMPLATE_QUERY_ERROR');

      const infoMessages = logSpy.mock.calls.map(([msg]) => msg as string);
      const sentLine = infoMessages.find((msg) =>
        msg.includes('Notification sent'),
      );
      expect(sentLine).toContain('agreement_id=B');

      // KZ-001 fidelity check: group B's body actually went through real
      // Handlebars — no unresolved token reached the outbound `sendEmail`
      // call. This is the assertion the previous `_getTemplate` stub would
      // have passed vacuously (the stub's return value has no `{{` in it
      // either way, rendered or not).
      const body = (
        sendEmail.mock.calls[0][0].message.socketFile as Buffer
      ).toString('utf-8');
      expect(body).not.toContain('{{');

      expect(repo.updateNotificationStatus).toHaveBeenCalledWith(
        9,
        NotificationStatus.PARTIAL,
        expect.any(Date),
      );
    });
  });

  describe('T-12 — R-CBU-004 AC.4 orphaned AC: dropped recipient logged at debug, wired through dispatch()', () => {
    it('a malformed file-contact email is absent from cc AND named in a debug line carrying the bulk process id and agreement_id', async () => {
      const group = makeGroup();
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [group],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([makeMetricsRow('ABC-123')]);
      const { service, sendEmail } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );
      const debugSpy = jest.spyOn(
        (service as unknown as { logger: { _debug: jest.Mock } }).logger,
        '_debug',
      );

      await service.dispatch(9, [
        { email: 'John Doe', contract_code: undefined },
      ]);

      // Test it as a drop, not as a log call (tasks.md T-12): the malformed
      // value never reaches the actual outbound `cc`...
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail.mock.calls[0][0].cc).not.toContain('John Doe');
      // ...AND a debug line names it. A spy on `_debug` alone — without the
      // `cc` assertion above — would pass for a builder that logs every
      // candidate and drops nothing.
      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(debugSpy.mock.calls[0][0]).toContain('John Doe');
      expect(debugSpy.mock.calls[0][0]).toContain('bulk_upload_process_id=9');
      expect(debugSpy.mock.calls[0][0]).toContain('agreement_id=ABC-123');
    });

    it('no malformed entries -> no debug log at all', async () => {
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
      const debugSpy = jest.spyOn(
        (service as unknown as { logger: { _debug: jest.Mock } }).logger,
        '_debug',
      );

      await service.dispatch(9);

      expect(debugSpy).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Audit gap-fill — R-CBU-002 AC.1/AC.2, R-CBU-006 AC.6, R-CBU-008 AC.1
  //
  // Every pre-existing multi-group `dispatch()` test builds its groups from
  // `makeMetricsRow(id)` with the SAME default `trainings_count` (5) and the
  // SAME PI/RA fixture, so per-group scoping had no observable consequence.
  // Three mutations confirmed it was ungated:
  //   * per-group metrics -> batch-wide sum  ................ 116/116 green
  //   * `totalCapdevResults +=` -> `=` (last group wins) .... 116/116 green
  //   * file-contact `contract_code` filter removed ......... green at
  //     dispatch level (only the builder's own unit spec went red)
  // The fixture below is the one that distinguishes the groups: distinct
  // training counts, distinct PIs, distinct RAs, contract-scoped contacts.
  // -----------------------------------------------------------------------
  describe('dispatch — per-group scoping across a 3-contract batch', () => {
    const AGREEMENTS = ['CTR-A', 'CTR-B', 'CTR-C'] as const;
    const TRAININGS: Record<string, number> = {
      'CTR-A': 5,
      'CTR-B': 2,
      'CTR-C': 7,
    };

    /** One group per contract, each with its OWN PI and RA address. */
    function groupFor(agreementId: string): CapdevBulkGroupDto {
      const slug = agreementId.toLowerCase();
      return makeGroup({
        agreement_id: agreementId,
        pi: {
          carnet: `pi-${slug}`,
          first_name: 'Lead',
          last_name: agreementId,
          email: `pi.${slug}@example.org`,
        },
        ra: {
          carnet: `ra-${slug}`,
          first_name: 'Assistant',
          last_name: agreementId,
          email: `ra.${slug}@example.org`,
        },
      });
    }

    async function dispatchThreeGroups(
      fileContacts: Array<{ email: string; contract_code?: string }> = [],
    ) {
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: AGREEMENTS.map(groupFor),
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue(
        AGREEMENTS.map((id) =>
          makeMetricsRow(id, {
            trainings_count: TRAININGS[id],
            // Distinct participant totals too, so a batch-wide participants
            // regression is caught by the same fixture.
            participants_total: TRAININGS[id] * 10,
            female_participants_total: TRAININGS[id] * 4,
          }),
        ),
      );
      repository.findCountries.mockResolvedValue(
        AGREEMENTS.map((id) =>
          makeCountriesRow(id, {
            country_names: [id === 'CTR-A' ? 'Kenya' : 'Uganda'],
            iso_alpha2_list: [id === 'CTR-A' ? 'KE' : 'UG'],
          }),
        ),
      );
      repository.countTotalResults.mockResolvedValue(20);

      // No `sendGroupNotification` stub — the real method renders each body
      // through the real on-disk template and real Handlebars (KZ-001), so
      // the per-group numbers asserted below are the ones a Project Leader
      // would actually read.
      const { service, sendEmail } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );
      const logSpy = jest.spyOn(
        (service as unknown as { logger: { _log: jest.Mock } }).logger,
        '_log',
      );

      await service.dispatch(77, fileContacts);

      /** The `EmailBody` dispatched for one contract, by subject token. */
      const emailFor = (agreementId: string) =>
        sendEmail.mock.calls
          .map(([body]) => body)
          .find((body) => body.subject.startsWith(`[${agreementId}]`));

      return { repository, sendEmail, emailFor, logSpy };
    }

    it('R-CBU-011 AC.1/AC.2 — a 3-group batch produces 3 info logs, each naming the bulk process id and its own agreement_id, and none carrying an email address', async () => {
      const { logSpy } = await dispatchThreeGroups();

      const sentLines = logSpy.mock.calls
        .map(([msg]) => msg as string)
        .filter((msg) => msg.includes('Notification sent'));

      expect(sentLines).toHaveLength(3);
      for (const agreementId of AGREEMENTS) {
        const line = sentLines.find((msg) =>
          msg.includes(`agreement_id=${agreementId}`),
        );
        expect(line).toBeDefined();
        expect(line).toContain('bulk_upload_process_id=77');
        expect(line).toContain(`trainings=${TRAININGS[agreementId]}`);
      }

      // AC.2 — counts, never addresses, at info level. The fixture gives
      // every group a real PI and RA address, so a regression that logged
      // the recipient lists instead of their lengths would surface here.
      const infoMessages = logSpy.mock.calls.map(([msg]) => msg as string);
      expect(infoMessages.some((msg) => msg.includes('@'))).toBe(false);
    });

    it('R-CBU-002 AC.1 — a batch spanning 3 distinct contracts produces exactly 3 sendEmail calls, one per contract', async () => {
      const { sendEmail, emailFor } = await dispatchThreeGroups();

      expect(sendEmail).toHaveBeenCalledTimes(3);
      // ...and they are three DIFFERENT contracts, not the same one thrice —
      // "AND IT MUST use each group's own contract for the subject token".
      for (const agreementId of AGREEMENTS) {
        expect(emailFor(agreementId)).toBeDefined();
      }
    });

    it("R-CBU-002 AC.2 / R-CBU-006 AC.6 — each group's rendered body reports that group's own training count, never the batch total", async () => {
      const { emailFor } = await dispatchThreeGroups();

      for (const agreementId of AGREEMENTS) {
        const body = (
          emailFor(agreementId).message.socketFile as Buffer
        ).toString('utf-8');

        expect(body).toContain(
          `The records encompass ${TRAININGS[agreementId]} trainings`,
        );
        // The batch total (5 + 2 + 7 = 14) must never appear as the group's
        // headline figure — this is the assertion the batch-wide-metrics
        // mutation turns red.
        expect(body).not.toContain('The records encompass 14 trainings');
        // Participants are scoped the same way.
        expect(body).toContain(
          `${TRAININGS[agreementId] * 10} participants took part`,
        );
      }
    });

    it("R-CBU-002 Scenario 'Cross-project isolation' — no group's PI or RA appears in another group's `to` or `cc`", async () => {
      const { emailFor } = await dispatchThreeGroups();

      for (const own of AGREEMENTS) {
        const email = emailFor(own);
        const addresses = [...email.to, ...email.cc].map((a: string) =>
          a.toLowerCase(),
        );

        expect(email.to).toEqual([`pi.${own.toLowerCase()}@example.org`]);
        expect(addresses).toContain(`ra.${own.toLowerCase()}@example.org`);

        for (const other of AGREEMENTS.filter((id) => id !== own)) {
          const slug = other.toLowerCase();
          expect(addresses).not.toContain(`pi.${slug}@example.org`);
          expect(addresses).not.toContain(`ra.${slug}@example.org`);
        }
      }
    });

    it("R-CBU-005 AC.3 (integration) — a contract-scoped file contact reaches only its own group's cc, while an unscoped one reaches every group", async () => {
      const { emailFor } = await dispatchThreeGroups([
        { email: 'scoped-to-a@example.org', contract_code: 'CTR-A' },
        { email: 'everyone@example.org' },
      ]);

      expect(emailFor('CTR-A').cc).toEqual(
        expect.arrayContaining(['scoped-to-a@example.org']),
      );
      // The leak this closes at the dispatch level: previously only the
      // builder's own unit spec caught a dropped `contract_code` filter.
      expect(emailFor('CTR-B').cc).not.toContain('scoped-to-a@example.org');
      expect(emailFor('CTR-C').cc).not.toContain('scoped-to-a@example.org');

      for (const agreementId of AGREEMENTS) {
        expect(emailFor(agreementId).cc).toEqual(
          expect.arrayContaining(['everyone@example.org']),
        );
      }
    });

    it("R-CBU-008 AC.1 — the persisted total_capdev_results is the SUM of every group's training count, not one group's", async () => {
      const { repository } = await dispatchThreeGroups();

      const aggregate = repository.persistProcessMetrics.mock.calls[0][1];
      expect(aggregate.total_capdev_results).toBe(5 + 2 + 7);
      expect(aggregate.total_participants).toBe((5 + 2 + 7) * 10);
      expect(aggregate.total_female_participants).toBe((5 + 2 + 7) * 4);
      // `total_results` stays the batch-wide scalar read, unfolded from the
      // CapDev groups.
      expect(aggregate.total_results).toBe(20);
      // Countries are the batch-wide distinct ISO set across all groups.
      expect([...aggregate.countries].sort()).toEqual(['KE', 'UG']);
    });

    it('R-CBU-003 Scenario "Unresolvable PI" (integration) — a group whose PI is unresolvable but whose RA is not dispatches no email at all, and does not abort the other groups', async () => {
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [
          // The mutation-relevant fixture: unresolvable PI *with* a usable
          // CC candidate sitting right next to it.
          makeGroup({
            agreement_id: 'CTR-A',
            pi: {
              carnet: 'pi-a',
              first_name: 'Lead',
              last_name: 'A',
              email: null,
            },
            ra: {
              carnet: 'ra-a',
              first_name: 'Assistant',
              last_name: 'A',
              email: 'ra.ctr-a@example.org',
            },
          }),
          groupFor('CTR-B'),
        ],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([
        makeMetricsRow('CTR-A'),
        makeMetricsRow('CTR-B'),
      ]);
      const { service, sendEmail } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository },
      );

      await service.dispatch(78);

      // Exactly one email, and it is group B's — group A produced none, and
      // its RA was never promoted into a `to` slot.
      expect(sendEmail).toHaveBeenCalledTimes(1);
      const only = sendEmail.mock.calls[0][0];
      expect(only.subject.startsWith('[CTR-B]')).toBe(true);
      expect([...only.to, ...only.cc]).not.toContain('ra.ctr-a@example.org');
      // "AND IT MUST NOT abort the notifications of the other project groups".
      expect(repository.updateNotificationStatus).toHaveBeenCalledWith(
        78,
        NotificationStatus.PARTIAL,
        expect.any(Date),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Audit gap-fill — R-CBU-009 AC.3 (no caching that outlives the request)
  //
  // Mutation-confirmed ungated: memoising the flag on the service instance
  // (`this.cachedFlag ??= await ...`) left all 116 notification tests green,
  // because no test called `dispatch()` twice on one instance.
  // -----------------------------------------------------------------------
  describe('dispatch — R-CBU-009 AC.3 kill-switch re-read', () => {
    it('a flag flipped between two bulk runs takes effect on the second, with no restart: the config is read once per dispatch, never memoised', async () => {
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [makeGroup()],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([
        makeMetricsRow('ABC-123', { trainings_count: 3 }),
      ]);
      const envAppConfig = createEnvAppConfigMock();
      // Run 1: off. Run 2: on. Same service instance, no re-construction.
      envAppConfig.CAPDEV_BULK_UPLOAD_ENABLED.mockResolvedValueOnce({
        value: false,
        defaulted: false,
      }).mockResolvedValueOnce({ value: true, defaulted: false });
      const { service, sendEmail } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository, envAppConfig },
      );

      await service.dispatch(101);
      expect(sendEmail).not.toHaveBeenCalled();
      expect(repository.updateNotificationStatus).toHaveBeenLastCalledWith(
        101,
        NotificationStatus.SKIPPED,
        null,
      );

      await service.dispatch(102);

      // The second run picked up the new value — a memoised flag would leave
      // this at zero sends and SKIPPED.
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(repository.updateNotificationStatus).toHaveBeenLastCalledWith(
        102,
        NotificationStatus.SENT,
        expect.any(Date),
      );
      // Read once per run, not once per process.
      expect(envAppConfig.CAPDEV_BULK_UPLOAD_ENABLED).toHaveBeenCalledTimes(2);
    });

    it('R-CBU-009 AC.1 — metrics are still persisted on the flag-off run, so a kill-switched batch is not a data gap', async () => {
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [makeGroup()],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([
        makeMetricsRow('ABC-123', {
          trainings_count: 3,
          participants_total: 30,
        }),
      ]);
      const envAppConfig = createEnvAppConfigMock({
        enabled: { value: false, defaulted: false },
      });
      const { service } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository, envAppConfig },
      );

      await service.dispatch(103);

      expect(repository.persistProcessMetrics).toHaveBeenCalledWith(
        103,
        expect.objectContaining({
          total_capdev_results: 3,
          total_participants: 30,
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Audit gap-fill — R-CBU-004 AC.5/AC.6 at the dispatch level
  // -----------------------------------------------------------------------
  describe('dispatch — R-CBU-004 AC.5/AC.6 configured-CC sources', () => {
    const ORIGINAL_SPRM = process.env.ARI_SPRM_EMAIL;

    afterEach(() => {
      if (ORIGINAL_SPRM === undefined) delete process.env.ARI_SPRM_EMAIL;
      else process.env.ARI_SPRM_EMAIL = ORIGINAL_SPRM;
    });

    it('AC.6 — with the EMAIL.CAPDEV_BULK_UPLOAD.CC_EMAIL row absent, the email is still sent with the remaining CC sources, plus one warn naming the key', async () => {
      process.env.ARI_SPRM_EMAIL = 'alliance-sprm@example.org';
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [makeGroup()],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([makeMetricsRow('ABC-123')]);
      const envAppConfig = createEnvAppConfigMock({
        cc: { value: [], defaulted: true },
      });
      const { service, sendEmail } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository, envAppConfig },
      );
      const warnSpy = jest.spyOn(
        (service as unknown as { logger: { _warn: jest.Mock } }).logger,
        '_warn',
      );

      await service.dispatch(104);

      // AC.6's headline: an absent optional config row never blocks the mail.
      expect(sendEmail).toHaveBeenCalledTimes(1);
      // AC.5 — with every optional source absent, CC still carries SPRM.
      expect(sendEmail.mock.calls[0][0].cc).toEqual([
        'alliance-sprm@example.org',
      ]);
      expect(
        warnSpy.mock.calls.some(([msg]) =>
          (msg as string).includes('EMAIL.CAPDEV_BULK_UPLOAD.CC_EMAIL'),
        ),
      ).toBe(true);
      expect(repository.updateNotificationStatus).toHaveBeenCalledWith(
        104,
        NotificationStatus.SENT,
        expect.any(Date),
      );
    });

    it('AC.2 — the configured CC row and the SPRM group contributing the same address yields exactly one cc entry', async () => {
      process.env.ARI_SPRM_EMAIL = 'alliance-sprm@example.org';
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [makeGroup()],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([makeMetricsRow('ABC-123')]);
      const envAppConfig = createEnvAppConfigMock({
        // Same address, different casing, from a different source.
        cc: { value: ['Alliance-SPRM@Example.org'], defaulted: false },
      });
      const { service, sendEmail } = await createService(
        { template: REAL_TEMPLATE_HTML },
        { repository, envAppConfig },
      );

      await service.dispatch(105);

      const cc: string[] = sendEmail.mock.calls[0][0].cc;
      expect(
        cc.filter((a) => a.toLowerCase() === 'alliance-sprm@example.org'),
      ).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Audit gap-fill — NFR-CBU-003 structural substitute
  //
  // The requirement's own verification clause asks for "a unit test asserting
  // the rendered body excludes `trainee_name` VALUES". That test is
  // structurally unconstructible: neither `CapdevBulkEmailTemplateDto` nor
  // `CapdevBulkMetricsDto` carries a participant-level field, so there is no
  // value in any fixture whose absence could be asserted. The shipped
  // assertion (`expect(body).not.toContain('trainee_name')`) checks for the
  // COLUMN NAME, which would not catch a future field that leaked a trainee's
  // actual name.
  //
  // The substitute below closes the real risk instead: it pins the template's
  // variable set and the DTO's key set as a CLOSED aggregate contract. Any
  // future participant-level slot — in the template or in the data object
  // handed to Handlebars — turns these red and forces a security re-review,
  // which is the control NFR-CBU-003 actually exists to provide.
  // -----------------------------------------------------------------------
  describe('NFR-CBU-003 — closed aggregate contract (structural substitute)', () => {
    const ALLOWED_TEMPLATE_FIELDS = [
      'projectLeadName',
      'trainingsCount',
      'countries',
      'startDate',
      'endDate',
      'participantsCount',
      'percentageWomen',
      'starLink',
      'tokenOwnerName',
      'tokenOwnerEmail',
    ].sort();

    it('the on-disk template interpolates ONLY aggregate-level variables — no participant-level slot can exist in it', () => {
      // Every `{{...}}` / `{{{...}}}` token, minus block helpers (`#if`,
      // `/if`) which are control flow, not data slots.
      const tokens = new Set<string>();
      for (const [, raw] of REAL_TEMPLATE_HTML.matchAll(
        /\{\{\{?([^}]+)\}?\}\}/g,
      )) {
        const name = raw.trim().replace(/^#if\s+/, '');
        if (name.startsWith('/')) continue;
        tokens.add(name);
      }

      expect([...tokens].sort()).toEqual(ALLOWED_TEMPLATE_FIELDS);
    });

    it('the data object handed to Handlebars carries ONLY those aggregate keys — never a participant list, name or per-trainee record', async () => {
      const repository = createRepositoryMock();
      repository.findGroups.mockResolvedValue({
        groups: [makeGroup()],
        multiPrimaryWarnings: [],
      });
      repository.findMetrics.mockResolvedValue([makeMetricsRow('ABC-123')]);

      // A real TemplateService, spied at `_getTemplate` purely to CAPTURE the
      // data argument — it still delegates to the real render, so the body
      // that reaches `sendEmail` is genuinely templated (KZ-001).
      const templateService = createTemplateService({
        template: REAL_TEMPLATE_HTML,
      });
      const getTemplateSpy = jest.spyOn(templateService, '_getTemplate');

      const { service, sendEmail } = await createService(null, {
        repository,
        templateService,
      });

      await service.dispatch(106);

      expect(getTemplateSpy).toHaveBeenCalledTimes(1);
      const data = getTemplateSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(Object.keys(data).sort()).toEqual(ALLOWED_TEMPLATE_FIELDS);

      // And every substituted value is a plain string — a nested object or
      // array is how a participant-level record would arrive at the template
      // in the first place.
      for (const value of Object.values(data)) {
        expect(typeof value).toBe('string');
      }

      const body = extractBody(sendEmail);
      expect(body).not.toContain('{{');
    });
  });
});
