import { Global, Module } from '@nestjs/common';
import { SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultInnovationUseModule } from './result-innovation-use.module';
import { ResultInnovationUseService } from './result-innovation-use.service';
import { LinkResultsModule } from '../link-results/link-results.module';
import { LinkResultsService } from '../link-results/link-results.service';
import { ResultsModule } from '../results/results.module';
import { ResultsService } from '../results/results.service';
import { ResultActorsModule } from '../result-actors/result-actors.module';
import { ResultActorsService } from '../result-actors/result-actors.service';
import { ResultInstitutionTypesModule } from '../result-institution-types/result-institution-types.module';
import { ResultInstitutionTypesService } from '../result-institution-types/result-institution-types.service';
import { ResultQuantificationsModule } from '../result-quantifications/result-quantifications.module';
import { ResultQuantificationsService } from '../result-quantifications/result-quantifications.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ResultsUtil } from '../../shared/utils/results.util';
import { PortfolioUtil } from '../../shared/utils/portfolio.util';

/**
 * T-05 (design.md §5.3, DD-9) — real module/DI compile.
 *
 * **Why every sibling import is overridden, not just `ResultsModule`.**
 * `ResultsModule` transitively pulls in ~40 sibling entity modules
 * (`results.module.ts`), and compiling it — or anything that reaches it —
 * outside `AppModule`'s exact production boot order is not viable
 * regardless of T-05: probed and reproduced on the pre-T-05 tree, compiling
 * bare `ResultsModule` alone crashes the Node process with `RangeError:
 * Maximum call stack size exceeded` inside Nest's own
 * `InstanceWrapper.cloneStaticInstance` / `getInstanceByContextId` (a
 * request-scoped-provider + circular-module interaction, not anything T-05
 * touches). A second, independent pre-existing defect was hit on the way to
 * this file: compiling `ResultInnovationUseModule` with NO overrides at all
 * fails first with `Nest cannot create the ResultPolicyChangeModule
 * instance. The module at index [0] ... is undefined`.
 *
 * ⚠️ **That second one is INTRODUCED BY THIS TASK, not pre-existing — the
 * first version of this comment said otherwise and was wrong.** Measured
 * 2026-09-09 by reverting T-05's three tracked files to `HEAD` and re-running
 * the same no-override probe: on the pre-T-05 tree it throws a *different*
 * error entirely (`Nest can't resolve dependencies of the
 * ResultInstitutionTypesService … DataSource at index [0]` — just the probe's
 * missing global stub), never the `ResultPolicyChangeModule` one. The chain
 * this task creates:
 *
 *     result-innovation-use.module.ts  requires link-results.module   <-- NEW here
 *       link-results.module.ts:4       requires results.module
 *         results.module.ts:10         requires result-policy-change.module
 *           result-policy-change.module.ts:4  requires link-results.module  (IN FLIGHT)
 *                                             -> partial exports -> imports[0] === undefined
 *
 * **Production is unaffected, and the reason is now load-bearing:**
 * `entities.module.ts` imports `results.module` at **:4** and
 * `result-innovation-use.module` at **:48**, so the real boot always enters
 * the graph in the safe order. That ordering is asserted below — it was
 * incidental before this task and is a boot invariant after it.
 *
 * The `RangeError` above IS genuinely pre-existing (stash-verified on a clean
 * tree) and is out of T-05's scope.
 *
 * `overrideModule` swaps in lightweight stand-ins for the five modules
 * `ResultInnovationUseModule` imports (all five are external to this task's
 * two-file diff) so this test exercises the REAL, unmodified
 * `ResultInnovationUseModule` and `ResultInnovationUseService` — including
 * both `forwardRef` sites this task adds — without walking the unrelated
 * exploding graph above. `ResultActorsModule` / `ResultInstitutionTypesModule`
 * / `ResultQuantificationsModule` carry no cycle risk (design.md §5.3) and
 * are stood in only to drop their controllers/interceptors (`SetUpInterceptor`,
 * `ResultStatusGuard`), which need `ResultsUtil`/`PortfolioUtil` this test has
 * no reason to exercise.
 *
 * **What this proves — and it is NARROWER than "the app boots".** Leader
 * measurement, 2026-09-09: the real boot is **unreachable in this
 * environment on either available route.** `npm run test:e2e` (which
 * imports the real `AppModule`) dies with the same `RangeError: Maximum
 * call stack size exceeded` — confirmed by stashing this task's diff and
 * re-running on a clean tree, so it is pre-existing, not caused here. And a
 * local `nest start` initializes 20 modules and then stalls on TypeORM's
 * `connect ETIMEDOUT` against the remote Dev MySQL **before** reaching this
 * module. So what this test proves is exactly:
 * `ResultInnovationUseModule` resolves its real `imports` array (with
 * `forwardRef(() => ResultsModule)`) and `ResultInnovationUseService`
 * resolves its real constructor (with `@Inject(forwardRef(() =>
 * ResultsService))`) against a non-circular provider graph.
 *
 * **What this does NOT prove — reported, not hidden (K-004/KZ-014).** The
 * FALSIFIER in tasks.md does NOT go red against the **`compile()`** case
 * below, on either axis. It DOES go red against the metadata cases — see
 * their own comments; those are the falsifiable gate, and the repo's child
 * guide (`server/researchindicators/src/CLAUDE.md` §4) already prescribed
 * exactly that technique for this class of property, with
 * `entities.module.spec.ts:48` as the working instance. The `compile()` case
 * is kept because it guards real constructor resolvability, but it is NOT
 * the falsifier.
 *
 * Why `compile()` cannot see it, even after reconstructing the real
 * cyclic edge (a second variant of this file, not committed, replaced this
 * stand-in with one whose own `imports: [ResultInnovationUseModule]`
 * recreated the genuine bidirectional module reference `results.module.ts`
 * really has — still green both ways). Nest's `overrideModule` intercepts
 * by token identity before the scanner would hit the plain-vs-forwardRef
 * ordering problem, and a `useValue` provider swap resolves a constructor
 * parameter identically regardless of `forwardRef` wrapping. Neither
 * mutation is falsifiable through Nest's testing-module override machinery
 * — this is a property of the test technique, not evidence the cycle
 * premise is wrong. The cycle's existence is independently confirmed by
 * direct citation, not by a live boot test: `results.module.ts:31` imports
 * `ResultInnovationUseModule`, `:77` lists it in `imports`, and `:99`
 * exports `ResultsService` — verified at source, matching design.md §5.3
 * exactly.
 */
@Module({
  providers: [{ provide: ResultsService, useValue: {} }],
  exports: [ResultsService],
})
class ResultsModuleStandIn {}

@Module({
  providers: [{ provide: LinkResultsService, useValue: {} }],
  exports: [LinkResultsService],
})
class LinkResultsModuleStandIn {}

@Module({
  providers: [{ provide: ResultActorsService, useValue: {} }],
  exports: [ResultActorsService],
})
class ResultActorsModuleStandIn {}

@Module({
  providers: [{ provide: ResultInstitutionTypesService, useValue: {} }],
  exports: [ResultInstitutionTypesService],
})
class ResultInstitutionTypesModuleStandIn {}

@Module({
  providers: [{ provide: ResultQuantificationsService, useValue: {} }],
  exports: [ResultQuantificationsService],
})
class ResultQuantificationsModuleStandIn {}

@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useValue: {
        getRepository: jest.fn(() => ({
          metadata: { primaryColumns: [{ propertyName: 'id' }] },
        })),
      },
    },
    { provide: CurrentUserUtil, useValue: {} },
    { provide: UpdateDataUtil, useValue: {} },
    { provide: ResultsUtil, useValue: {} },
    { provide: PortfolioUtil, useValue: {} },
  ],
  exports: [
    DataSource,
    CurrentUserUtil,
    UpdateDataUtil,
    ResultsUtil,
    PortfolioUtil,
  ],
})
class GlobalStub {}

describe('ResultInnovationUseModule (T-05 DI compile — design.md §5.3, DD-9)', () => {
  it('compiles the real module + service with both forwardRef sites in place', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [GlobalStub, ResultInnovationUseModule],
    })
      .overrideModule(ResultsModule)
      .useModule(ResultsModuleStandIn)
      .overrideModule(LinkResultsModule)
      .useModule(LinkResultsModuleStandIn)
      .overrideModule(ResultActorsModule)
      .useModule(ResultActorsModuleStandIn)
      .overrideModule(ResultInstitutionTypesModule)
      .useModule(ResultInstitutionTypesModuleStandIn)
      .overrideModule(ResultQuantificationsModule)
      .useModule(ResultQuantificationsModuleStandIn)
      .compile();

    expect(moduleRef.get(ResultInnovationUseService)).toBeInstanceOf(
      ResultInnovationUseService,
    );
  });

  /**
   * THE FALSIFIABLE GATE (DD-9, module axis). Reads the `@Module()` metadata
   * as WRITTEN, so a `forwardRef` wrapper `{ forwardRef: fn }` and a plain
   * class reference are distinguishable — which `compile()` above cannot do,
   * because `overrideModule` intercepts by token identity first.
   *
   * FALSIFIER, observed red 2026-09-09: replace `forwardRef(() =>
   * ResultsModule)` with a plain `ResultsModule` in the module's `imports`
   * and this spec goes red on both expectations.
   */
  it('DD-9 module axis: ResultsModule is imported forwardRef-wrapped, never plainly', () => {
    const imports = Reflect.getMetadata(
      'imports',
      ResultInnovationUseModule,
    ) as unknown[];

    expect(imports).not.toContain(ResultsModule);
    expect(
      imports.some(
        (i) =>
          typeof (i as { forwardRef?: () => unknown })?.forwardRef ===
            'function' &&
          (i as { forwardRef: () => unknown }).forwardRef() === ResultsModule,
      ),
    ).toBe(true);

    // LinkResultsModule is imported PLAINLY and must stay that way — but NOT
    // because "it exports only LinkResultsService": exports do not determine
    // cycles, imports do, and LinkResultsModule -> ResultsModule -> this module
    // closes one (design.md §5.3, corrected by Amendment 06). The plain import
    // is right because a `forwardRef` would buy nothing here: the module is
    // reached before the cycle closes. What the transitive cycle DOES cause is
    // the boot-order dependency asserted in entities.module.spec.ts (R-8).
    expect(imports).toContain(LinkResultsModule);
  });

  /**
   * THE FALSIFIABLE GATE (DD-9, service axis) — and the measured proof that
   * this wrapper is load-bearing rather than defensive syntax.
   *
   * `results.service.ts` imports `ResultInnovationUseService` and this service
   * imports `ResultsService`, so the two files form a genuine circular import.
   * Measured consequence, 2026-09-09 — and it is **order-dependent**, which is
   * the whole point: with `results.service` required FIRST (the production
   * order, `entities.module.ts:4` before `:48`), `design:paramtypes` for this
   * constructor emits **`undefined` at index 6** — the `_resultsService` slot
   * — because the module object is still partially initialised when the
   * decorator evaluates. Entered from this module instead, the same slot emits
   * `[Function ResultsService]`. So in the order production actually uses,
   * `@Inject(forwardRef(() => ResultsService))` is what supplies a token Nest
   * would otherwise not have at all. It is load-bearing, not defensive.
   *
   * (`ResultsService`'s own 39 paramtypes carry no `undefined`, so its plain
   * `ResultInnovationUseService` injection at `results.service.ts:152` still
   * resolves — measured, and the reason DD-9's one-sided form is sufficient.)
   *
   * FALSIFIER, observed red 2026-09-09: delete the `@Inject(forwardRef(...))`
   * and this spec goes red.
   */
  it('DD-9 service axis: the ResultsService param is @Inject(forwardRef(...))-declared', () => {
    // NOTE — deliberately NOT asserting `design:paramtypes[6] === undefined`
    // here, and the reason is a correction to an earlier version of this
    // comment. The erasure is REQUIRE-ORDER DEPENDENT, measured both ways
    // 2026-09-09:
    //   * require `results.service` FIRST (the production order,
    //     `entities.module.ts:4` before `:48`) -> paramtypes[6] is
    //     **undefined**; `ResultsService`'s own 39 paramtypes stay clean.
    //   * require this module first (what THIS spec file does) ->
    //     paramtypes[6] is `[Function ResultsService]`, defined.
    // So the emitted metadata is not a stable assertion target from inside a
    // spec whose own imports fix the order. What IS stable — and what actually
    // falsifies DD-9's service axis — is the explicit declaration below.
    const selfDeclared = Reflect.getMetadata(
      SELF_DECLARED_DEPS_METADATA,
      ResultInnovationUseService,
    ) as { index: number; param: unknown }[];

    // Index-independent on purpose: T-06/T-07 are about to edit this
    // constructor, and pinning a position would make an unrelated insertion
    // look like a DD-9 violation.
    expect(
      selfDeclared?.some(
        (d) =>
          typeof (d.param as { forwardRef?: () => unknown })?.forwardRef ===
            'function' &&
          (d.param as { forwardRef: () => unknown }).forwardRef() ===
            ResultsService,
      ),
    ).toBe(true);
  });
});
