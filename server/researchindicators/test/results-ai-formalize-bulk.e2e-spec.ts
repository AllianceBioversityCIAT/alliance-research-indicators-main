import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtMiddleware } from '../src/domain/shared/middlewares/jwr.middleware';
import { RolesGuard } from '../src/domain/shared/guards/roles.guard';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import { ResultsService } from '../src/domain/entities/results/results.service';
import { RootAi } from '../src/domain/entities/results/dto/result-ai.dto';
import { CapdevBulkNotificationService } from '../src/domain/entities/ai-reports/notifications/capdev-bulk-notification.service';
import { CapdevBulkNotificationRepository } from '../src/domain/entities/ai-reports/notifications/capdev-bulk-notification.repository';
import { TemplateService } from '../src/domain/shared/auxiliar/template/template.service';
import { TemplateEnum } from '../src/domain/shared/auxiliar/template/enum/template.enum';
import { EnvAppConfigUtil } from '../src/domain/shared/utils/env-app-config.util';
import { MessageMicroservice } from '../src/domain/tools/broker/message.microservice';
import { EmailBody } from '../src/domain/tools/broker/dto/mailer.dto';

/**
 * T-11 — the payload contract holds both ways (tasks.md, requirements.md
 * R-CBU-005, design.md §5 / defect class D4).
 *
 * Architecture (decision D-T11-a, spec-owner): boots the REAL `AppModule`
 * and must write ZERO rows to the shared dev MySQL. Seam map:
 *
 *   JwtMiddleware                 -> bypassed (stub req.user)
 *   RolesGuard                    -> overridden (always allow)
 *   ValidationPipe (per-handler)  -> REAL   <-- the D4 gate
 *   GlobalExceptions/Response     -> REAL   <-- the 400 envelope
 *   ResultsService.createResultFromAiBulk -> stubbed at the prototype
 *     level (it is transitively request-scoped via ResultsUtil /
 *     CurrentUserUtil, so a `.get()`-fetched instance would never be the
 *     one Nest constructs for a real HTTP request — patching the shared
 *     prototype method is what actually reaches the request path). The
 *     stub skips result/process persistence but calls the REAL,
 *     DI-resolved `CapdevBulkNotificationService.dispatch()` so bullet 2
 *     genuinely exercises buildRecipients -> formatCapdevMetrics ->
 *     sendGroupNotification.
 *   CapdevBulkNotificationRepository -> its 4 reads + 2 writes spied,
 *     returning one synthetic group per test (never touches the DB).
 *   EnvAppConfigUtil.CAPDEV_BULK_UPLOAD_ENABLED/_CC_EMAIL -> spied
 *     (flag seeded 'false' on dev per T-03 — without an override bullet 2
 *     proves nothing, dispatch() would return SKIPPED).
 *   TemplateService._getTemplate -> spied to compile the REAL on-disk
 *     `capdev-bulk-summary.html` (KZ-001: a `template: ''` stub would make
 *     the CC assertion vacuous — T-04's migration for this row is
 *     unapplied on dev, so the DB path is unusable here regardless).
 *   MessageMicroservice.sendEmail -> provider-overridden with a jest.fn()
 *     (never touches the RMQ broker; this is also the CC assertion point
 *     for bullet 2). Provider override, not instance spy — see the
 *     `beforeAll` comment for why an instance spy silently fails here.
 */

const CAPDEV_TEMPLATE_HTML_PATH = path.join(
  __dirname,
  '../src/domain/shared/auxiliar/template/template/capdev-bulk-summary.html',
);
const REAL_CAPDEV_TEMPLATE_HTML = fs.readFileSync(
  CAPDEV_TEMPLATE_HTML_PATH,
  'utf-8',
);

/** Minimal valid `ResultRawAi` — only the fields the DTO requires. */
function minimalValidResult(contractCode: string) {
  return {
    contract_code: contractCode,
    indicator: 'capacity-sharing-for-development',
    title: 'E2E Test Training Result',
  };
}

describe('POST /results/ai/formalize/bulk — payload contract (T-11, R-CBU-005, D4)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  let capdevBulkNotificationService: CapdevBulkNotificationService;
  let capdevRepository: CapdevBulkNotificationRepository;
  let envAppConfig: EnvAppConfigUtil;
  let templateService: TemplateService;

  let createResultFromAiBulkSpy: jest.SpyInstance;
  let sendEmailSpy: jest.Mock;
  let enabledSpy: jest.SpyInstance;
  let ccSpy: jest.SpyInstance;
  let findGroupsSpy: jest.SpyInstance;
  let findMetricsSpy: jest.SpyInstance;
  let findCountriesSpy: jest.SpyInstance;
  let findUnattributedSpy: jest.SpyInstance;
  let countTotalSpy: jest.SpyInstance;
  let persistMetricsSpy: jest.SpyInstance;
  let updateStatusSpy: jest.SpyInstance;

  let nextProcessId = 900_000;

  beforeAll(async () => {
    // JwtMiddleware is applied via `NestModule.configure()` +
    // `consumer.apply(JwtMiddleware)`, which resolves its instance through
    // Nest's own `MiddlewareModule`/`Injector` machinery rather than the
    // TestingModule's provider container — empirically,
    // `.overrideProvider(JwtMiddleware).useValue(...)` compiles cleanly but
    // the real class still runs at request time (root-caused by inspecting
    // the 401 stack trace, which pointed at `jwr.middleware.ts:54`, the real
    // `use()`'s throw — not the stub). Patching the shared PROTOTYPE method
    // works regardless of which instance Nest constructs, exactly like the
    // `ResultsService.createResultFromAiBulk` stub below.
    jest
      .spyOn(JwtMiddleware.prototype, 'use')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(async (req: any, _res: any, next: any) => {
        req.user = {
          sec_user_id: 900_001,
          email: 'e2e-runner@example.org',
          first_name: 'E2E',
          last_name: 'Runner',
          roles: [SecRolesEnum.TECHNICAL_SUPPORT],
        };
        return next();
      });

    // `MessageMicroservice` is declared as its own provider (not imported
    // from one shared module) in FIVE different feature modules
    // (result-status-workflow, result-oicr, ai-reports, green-checks,
    // reporting-feedback) — root-caused via `grep -rl MessageMicroservice
    // **/*.module.ts`, after `moduleFixture.get(MessageMicroservice)` +
    // `jest.spyOn(instance, 'sendEmail')` recorded zero calls despite
    // `updateNotificationStatus` showing `SENT`: each declaring module gets
    // its OWN separately-constructed instance, so the one `.get()` happened
    // to return was never the one `AiReportsModule`'s `CapdevBulkNotificationService`
    // was actually injected with — the real send silently went to the real
    // `client.emit()` on a *different* instance instead of the spy.
    // `.overrideProvider(MessageMicroservice)` patches the token across
    // EVERY declaring module at once, which both fixes the spy and — more
    // importantly — guarantees this suite can never reach the real RMQ
    // broker (the whole point of the CC assertion is a spy that captures the
    // real call, not a live send).
    const sendEmailMock = jest.fn().mockResolvedValue(undefined);

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(MessageMicroservice)
      .useValue({ sendEmail: sendEmailMock })
      .compile();

    sendEmailSpy = sendEmailMock;

    app = moduleFixture.createNestApplication();
    // main.ts bootstrap steps this test must replicate to hit the real
    // route: global `/api` prefix + URI versioning. `createResultFromAiBulk`
    // itself carries no `@Version()` (only one endpoint in this controller
    // does), so under URI versioning with no `defaultVersion` configured
    // (matches main.ts) it is mounted unversioned — confirmed by booting
    // the app and listing its Express route table, which reports
    // `POST /api/results/ai/formalize/bulk` (no `/v1` segment). design.md
    // §5 documents `/api/v1/...`; that segment does not exist for this
    // handler today. This test targets the route that is actually
    // reachable, which is the only way D4 (a legacy caller getting a real
    // 400) is genuinely exercised.
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();

    capdevBulkNotificationService = moduleFixture.get(
      CapdevBulkNotificationService,
    );
    capdevRepository = moduleFixture.get(CapdevBulkNotificationRepository);
    envAppConfig = moduleFixture.get(EnvAppConfigUtil);
    templateService = moduleFixture.get(TemplateService);

    // --- TemplateService._getTemplate: spy, compiles the REAL on-disk file
    // (KZ-001 — never an empty-string stub) instead of reading `sec_template`
    // (T-04's row is unapplied on dev at the time this task runs).
    jest
      .spyOn(templateService, '_getTemplate')
      .mockImplementation(async (name: unknown, data?: unknown) => {
        if (name !== TemplateEnum.CAPDEV_BULK_UPLOAD_SUMMARY) {
          throw new Error(
            `Unexpected template requested in e2e stub: ${String(name)}`,
          );
        }
        return data === undefined
          ? REAL_CAPDEV_TEMPLATE_HTML
          : Handlebars.compile(REAL_CAPDEV_TEMPLATE_HTML)(data);
      });

    // --- CapdevBulkNotificationRepository: the 4 reads + 2 writes, spied.
    // Defaults to "zero groups" (the cheap SKIPPED path) — bullet 2
    // overrides `findGroups`/`findMetrics`/`findCountries`/`countTotalResults`
    // per-call via `mockResolvedValueOnce`.
    findGroupsSpy = jest
      .spyOn(capdevRepository, 'findGroups')
      .mockResolvedValue({ groups: [], multiPrimaryWarnings: [] });
    findMetricsSpy = jest
      .spyOn(capdevRepository, 'findMetrics')
      .mockResolvedValue([]);
    findCountriesSpy = jest
      .spyOn(capdevRepository, 'findCountries')
      .mockResolvedValue([]);
    findUnattributedSpy = jest
      .spyOn(capdevRepository, 'findUnattributedResultIds')
      .mockResolvedValue([]);
    countTotalSpy = jest
      .spyOn(capdevRepository, 'countTotalResults')
      .mockResolvedValue(0);
    persistMetricsSpy = jest
      .spyOn(capdevRepository, 'persistProcessMetrics')
      .mockResolvedValue(undefined);
    updateStatusSpy = jest
      .spyOn(capdevRepository, 'updateNotificationStatus')
      .mockResolvedValue(undefined);

    // --- EnvAppConfigUtil: the flag is seeded 'false' on dev (T-03) — spy
    // it so bullet 2 can flip it on for that one call without touching the
    // real app_config table.
    enabledSpy = jest
      .spyOn(envAppConfig, 'CAPDEV_BULK_UPLOAD_ENABLED')
      .mockResolvedValue({ value: false, defaulted: false });
    ccSpy = jest
      .spyOn(envAppConfig, 'CAPDEV_BULK_UPLOAD_CC_EMAIL')
      .mockResolvedValue({ value: [], defaulted: false });

    // --- ResultsService.createResultFromAiBulk: stubbed on the PROTOTYPE
    // (not on a fetched instance — the real provider is transitively
    // request-scoped via ResultsUtil/CurrentUserUtil, so a `.get()`/
    // `.resolve()`-obtained instance is never the one Nest constructs for
    // an actual HTTP request; the prototype is shared across every
    // instance regardless of scope). Skips all result/process persistence
    // but calls the REAL `CapdevBulkNotificationService.dispatch()`, wrapped
    // exactly like the real method's outer containment boundary
    // (design.md §6.6) so a dispatch failure never surfaces as a 5xx.
    createResultFromAiBulkSpy = jest
      .spyOn(ResultsService.prototype, 'createResultFromAiBulk')
      .mockImplementation(async function (data: RootAi) {
        const processId = ++nextProcessId;
        try {
          await capdevBulkNotificationService.dispatch(
            processId,
            data.metadata?.contacts,
          );
        } catch {
          // R-CBU-010 / design.md §6.6 — nothing thrown from the
          // notification stage may reach the HTTP response.
        }
        return { results_errors: [], results_created: [] };
      });
  });

  afterEach(() => {
    // Per-call mocks only — the persistent implementations set in
    // beforeAll (sendEmail, _getTemplate, createResultFromAiBulk, and the
    // repository/env defaults) are untouched by `mockClear`.
    sendEmailSpy.mockClear();
    createResultFromAiBulkSpy.mockClear();
    enabledSpy.mockClear();
    ccSpy.mockClear();
    findGroupsSpy.mockClear();
    findMetricsSpy.mockClear();
    findCountriesSpy.mockClear();
    findUnattributedSpy.mockClear();
    countTotalSpy.mockClear();
    persistMetricsSpy.mockClear();
    updateStatusSpy.mockClear();
  });

  afterAll(async () => {
    // Harness defect (tasks.md T-11, inherited from T-10's A/B verification).
    // Both pieces below are required — `app.close()` alone is NOT the fix:
    //   - `app.close()` runs Nest's shutdown hooks (TypeORM's DataSource
    //     among them), but A/B-verified across two independent runs,
    //     closing the app here still left the underlying `node`/jest
    //     process alive 5+ minutes with no self-termination.
    //   - `"forceExit": true` in `test/jest-e2e.json` is the load-bearing
    //     part — deleting that config line restores the CI-blocking hang
    //     even with this `afterAll` in place.
    // `--detectOpenHandles` named NO open handle, so the residual leak is
    // masked here, not diagnosed (candidates: the mysql2 pool, OpenSearch
    // keep-alive, or `@nestjs/schedule` timers — not confirmed).
    await app?.close();
  });

  it('AC.1 / Scenario "Legacy caller" — a payload without metadata.contacts (the pre-T-01 ProcessMedatada shape) is accepted with 201', async () => {
    // Baseline B-1 (execution.md §2) — exactly the two properties the
    // pre-T-01 ProcessMedatada required, no `contacts` key. This is NOT
    // derived from the current DTO by omitting an optional field; it is
    // the literal shape a legacy AI-service caller sends today.
    const payload = {
      results: [minimalValidResult('AGR-E2E-LEGACY')],
      metadata: {
        file_name: 'legacy-upload.xlsx',
        ai_interaction_id: 'legacy-interaction-1',
      },
    };

    const res = await request(app.getHttpServer())
      .post('/api/results/ai/formalize/bulk')
      .send(payload)
      .expect(201);

    expect(res.body.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(createResultFromAiBulkSpy).toHaveBeenCalledTimes(1);
  });

  it('AC.2 — a contact with a valid email is accepted (201) and reaches EmailBody.cc through the real dispatch -> buildRecipients -> formatCapdevMetrics -> sendGroupNotification chain', async () => {
    const contactEmail = 'reporting.leader.e2e@example.org';
    const agreementId = 'AGR-E2E-100';

    enabledSpy.mockResolvedValueOnce({ value: true, defaulted: false });
    findGroupsSpy.mockResolvedValueOnce({
      groups: [
        {
          agreement_id: agreementId,
          project_lead_description: 'Fallback Lead Name',
          pi: {
            carnet: 'PI-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'pi.e2e@example.org',
          },
          ra: null,
          pa: null,
          token_owner: {
            sec_user_id: 42,
            first_name: 'Grace',
            last_name: 'Hopper',
            email: 'owner.e2e@example.org',
          },
        },
      ],
      multiPrimaryWarnings: [],
    });
    findMetricsSpy.mockResolvedValueOnce([
      {
        agreement_id: agreementId,
        trainings_count: 4,
        participants_total: 40,
        female_participants_total: 20,
        start_date: null,
        end_date: null,
      },
    ]);
    findCountriesSpy.mockResolvedValueOnce([
      {
        agreement_id: agreementId,
        country_names: ['Kenya'],
        iso_alpha2_list: ['KE'],
      },
    ]);
    countTotalSpy.mockResolvedValueOnce(4);

    const payload = {
      results: [minimalValidResult(agreementId)],
      metadata: {
        file_name: 'capdev-upload.xlsx',
        ai_interaction_id: 'capdev-interaction-1',
        contacts: [
          {
            email: contactEmail,
            name: 'Reporting Leader',
            role: 'reporting_leader',
            contract_code: agreementId,
          },
        ],
      },
    };

    const res = await request(app.getHttpServer())
      .post('/api/results/ai/formalize/bulk')
      .send(payload)
      .expect(201);

    expect(res.body.status).toBe(201);
    expect(createResultFromAiBulkSpy).toHaveBeenCalledTimes(1);

    // The CC assertion — proves the posted contact address survived the
    // REAL builder + formatter + template render, not a mocked echo.
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    const emailBody = sendEmailSpy.mock.calls[0][0] as EmailBody;
    expect(emailBody.to).toEqual(['pi.e2e@example.org']);
    expect(emailBody.cc).toEqual(expect.arrayContaining([contactEmail]));
    // Sanity: the send never used the repository writes as a DB round trip
    // — this run never touched the shared dev MySQL for this stage.
    expect(persistMetricsSpy).toHaveBeenCalledTimes(1);
    expect(updateStatusSpy).toHaveBeenCalledTimes(1);
  });

  it('AC.4 — a contact with a malformed email is rejected 400 in the GlobalExceptions envelope; the batch is not persisted', async () => {
    const callsBefore = createResultFromAiBulkSpy.mock.calls.length;
    const payload = {
      results: [minimalValidResult('AGR-E2E-BAD')],
      metadata: {
        file_name: 'malformed-upload.xlsx',
        ai_interaction_id: 'malformed-interaction-1',
        contacts: [{ email: 'not-an-email', name: 'Bad Contact' }],
      },
    };

    const res = await request(app.getHttpServer())
      .post('/api/results/ai/formalize/bulk')
      .send(payload)
      .expect(400);

    // GlobalExceptions envelope shape (global.exception.ts) — no `data` key.
    expect(res.body.status).toBe(400);
    expect(res.body.description).toBeDefined();
    expect(res.body.errors).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toBeDefined();

    // The ValidationPipe rejected before the controller handler ran — the
    // batch was never handed to the (stubbed) service at all.
    expect(createResultFromAiBulkSpy.mock.calls.length).toBe(callsBefore);
    expect(sendEmailSpy).not.toHaveBeenCalled();
    expect(persistMetricsSpy).not.toHaveBeenCalled();
  });
});
