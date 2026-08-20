import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { dataSource as rawTestDataSource } from '../../../src/db/config/mysql/orm.test.config';
import { GlobalUtilsModule } from '../../../src/domain/shared/utils/global-utils.module';
import { ResultInnovationUseModule } from '../../../src/domain/entities/result-innovation-use/result-innovation-use.module';
import { ResultInnovationUseService } from '../../../src/domain/entities/result-innovation-use/result-innovation-use.service';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../../src/domain/shared/utils/current-user.util';
import { ResultsUtil } from '../../../src/domain/shared/utils/results.util';

/**
 * T-09 (`docs/specs/innovation-use/details-api`) — design.md §10.4 "the
 * harness question", RB-4. Shared helper that boots a REAL Nest
 * `TestingModule` against the TEST datasource and resolves the REAL
 * `ResultInnovationUseService` — the first fixture in this repo to
 * instantiate a Nest provider at all (every sibling `*.fixture-spec.ts`
 * talks to MySQL through the raw `mysql2` driver only).
 *
 * **Why `GlobalUtilsModule` is imported even though `design.md` §10.4's
 * sketch names only `TypeOrmModule.forRoot` + `ResultInnovationUseModule`.**
 * `ResultInnovationUseModule`'s own subtree (itself, `ResultActorsModule`,
 * `ResultInstitutionTypesModule`, `ResultQuantificationsModule`) never
 * provides `CurrentUserUtil`, `ResultsUtil`, or `UpdateDataUtil` — in the
 * real app these three are satisfied ONLY because `GlobalUtilsModule` is
 * `@Global()` and imported once at `AppModule`'s root, making its exports
 * reachable from every feature module without a local import
 * (`global-utils.module.ts`). Omitting it here is not a smaller harness, it
 * is a broken one: `ResultInnovationUseService`'s constructor alone
 * requires `UpdateDataUtil`, which nothing in its declared imports
 * provides. Importing the same global module the production graph already
 * relies on is completing the DI graph, not improvising around a
 * boot failure — the escalation clause (`tasks.md` T-09) governs an
 * unfixable boot, not a module list that omitted its own global import.
 *
 * **`CurrentUserUtil` and `ResultsUtil` are still overridden.** Both inject
 * the `REQUEST` token (`current-user.util.ts`, `results.util.ts`), which
 * makes every consumer request-scoped by propagation — `moduleRef.get(...)`
 * cannot resolve a request-scoped provider outside a real HTTP request.
 * `.overrideProvider(...).useValue(...)` is Nest's standard answer (also
 * the reason `CurrentUserUtil` exposes `setSystemUser()` as a second escape
 * hatch): replacing the token with a plain singleton value removes the
 * REQUEST dependency from the graph entirely, so `ResultInnovationUseService`
 * — and everything it depends on — resolves as an ordinary singleton.
 *
 * **KZ-001 — the stub must evaluate, not merely exist.** `StubCurrentUserUtil`
 * below runs the exact same `switch (set)` the real `CurrentUserUtil.audit()`
 * runs, over a fixed acting-user id, because R-IUA-003 AC.6's
 * `created_by`/`updated_by` criterion depends on this stub genuinely
 * carrying that id through every write path — a stub that returns `{}`
 * unconditionally would let every audit-column assertion pass vacuously
 * (null equals null) while proving nothing.
 *
 * `UpdateDataUtil` is deliberately left un-stubbed: it only depends on
 * `DataSource` (no `REQUEST`), and T-08's advisory B-4 — "nothing at any
 * tier proves `create` honors the `manager` it receives" — is a claim
 * about the REAL transaction, which a stub would hide rather than expose.
 */

export class StubCurrentUserUtil {
  constructor(private readonly actingUserId: number) {}

  get user_id(): number {
    return this.actingUserId;
  }

  get user() {
    return { sec_user_id: this.actingUserId } as Record<string, unknown>;
  }

  get email(): string | undefined {
    return undefined;
  }

  get roles(): number[] {
    return [];
  }

  setSystemUser(): void {
    // No-op — this stub is already a fixed system user by construction.
  }

  clearSystemUser(): void {
    // No-op.
  }

  audit(set: SetAuditEnum = SetAuditEnum.NEW): Record<string, number> {
    switch (set) {
      case SetAuditEnum.NEW:
        return { created_by: this.actingUserId };
      case SetAuditEnum.UPDATE:
        return { updated_by: this.actingUserId };
      case SetAuditEnum.BOTH:
        return {
          created_by: this.actingUserId,
          updated_by: this.actingUserId,
        };
    }
  }
}

/**
 * `ResultsUtil`'s only in-graph consumers are the CONTROLLERS
 * (`ResultInnovationUseController`, `ResultActorsController`) — this
 * harness resolves and calls the SERVICE directly and never routes through
 * a controller, so this stub's getters are never read by the assertions
 * below. It exists only so the controllers (which Nest still instantiates
 * as part of compiling `ResultInnovationUseModule`) resolve without a real
 * `REQUEST` in scope.
 */
export class StubResultsUtil {
  get result(): unknown {
    return undefined;
  }

  get platformCode(): string | undefined {
    return undefined;
  }

  get resultId(): number | undefined {
    return undefined;
  }

  get resultCode(): number | undefined {
    return undefined;
  }

  get statusId(): number | undefined {
    return undefined;
  }

  get indicatorId(): number | undefined {
    return undefined;
  }
}

export interface InnovationUseHarness {
  moduleRef: TestingModule;
  dataSource: DataSource;
  service: ResultInnovationUseService;
  currentUser: StubCurrentUserUtil;
  close: () => Promise<void>;
}

/**
 * Boots the harness. Each caller gets its OWN `TestingModule` (and its own
 * Nest-managed `DataSource` connection) — this fixture file does not share
 * a module instance across `describe` blocks, matching every sibling
 * fixture file's own-connection-per-file discipline.
 */
export async function createInnovationUseHarness(
  actingUserId: number,
): Promise<InnovationUseHarness> {
  const currentUser = new StubCurrentUserUtil(actingUserId);
  const resultsUtil = new StubResultsUtil();

  const moduleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot(rawTestDataSource.options),
      GlobalUtilsModule,
      ResultInnovationUseModule,
    ],
  })
    .overrideProvider(CurrentUserUtil)
    .useValue(currentUser)
    .overrideProvider(ResultsUtil)
    .useValue(resultsUtil)
    .compile();

  // `.compile()` alone does not run lifecycle hooks — `TypeOrmModule`
  // establishes its connection in `onApplicationBootstrap`, which only
  // fires once this context is `.init()`ed (Nest testing-module gotcha).
  await moduleRef.init();

  const dataSource = moduleRef.get(DataSource);
  const service = moduleRef.get(ResultInnovationUseService);

  return {
    moduleRef,
    dataSource,
    service,
    currentUser,
    close: async () => {
      await moduleRef.close();
    },
  };
}
