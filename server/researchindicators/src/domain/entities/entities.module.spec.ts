import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EntitiesModule } from './entities.module';
import { ResultInnovationUseModule } from './result-innovation-use/result-innovation-use.module';

/**
 * T-07 attempt 2 (DD-15, tasks.md trap 4, KZ-001).
 *
 * `RouterModule.register()` never instantiates the modules it names — it
 * only stamps `MODULE_PATH` metadata onto the constructor and looks it up
 * in `modulesContainer`, returning silently when absent (verified at source
 * in `@nestjs/core/router/router-module.js`). The only thing that actually
 * instantiates a module is the `imports` array of a module already in the
 * graph. A spec asserting the shape of `main.routes.ts`'s `route` array
 * never evaluates that — it is the stand-in KZ-001 warns about. This file
 * asserts the real thing: module-graph membership, read via
 * `Reflect.getMetadata('imports', EntitiesModule)`.
 *
 * Sibling file, not an extension of `main.routes.spec.ts`: that file's own
 * docstring scopes it to the route *tree* ("route registration ...
 * verified only by npm run build / e2e / human inspection"), a different
 * concern from module-graph membership. `clarisa.module.spec.ts` is the
 * precedent for this concern living beside the module file it registers
 * into, not beside the routes file.
 *
 * Membership only, no transitive reachability walk: unlike `ClarisaModule`
 * (itself reached from `AppModule` through one further hop), `EntitiesModule`
 * is imported directly by `AppModule`.
 *
 * **Correction, false since T-08.** This originally claimed
 * `ResultInnovationUseModule` had exactly one incoming graph edge — this
 * assertion — with a reachability walk dismissed as marginal work proving
 * the same single edge a membership check already covers. That is no
 * longer true: `results.module.ts` also imports `ResultInnovationUseModule`
 * (T-08's DI edge), so there are at least two incoming edges, not one. That
 * makes this gate **over-strict, not under-strict** — deleting the
 * `entities.module.ts` entry this assertion checks would redden this spec
 * while `ResultInnovationUseModule`'s endpoints still resolve, reached
 * through `ResultsModule`'s edge instead. The assertion itself is
 * unchanged: membership through `EntitiesModule` is still real and worth
 * asserting, it is just no longer the module's only route into the graph.
 *
 * This does not boot Nest's DI container or a `TestingModule` — it only
 * reads the static `@Module()` metadata Nest's compiler attaches to each
 * class at decoration time via `reflect-metadata`.
 */
describe('EntitiesModule — result-innovation-use registration (DD-15)', () => {
  it('lists ResultInnovationUseModule in its own imports metadata', () => {
    const imports: unknown[] = Reflect.getMetadata('imports', EntitiesModule);

    expect(imports).toContain(ResultInnovationUseModule);
  });
});

/**
 * T-05 boot-order invariant — `docs/specs/innovation-use/link-innovation-dev`
 * §5 **R-8**.
 *
 * **Why this asserts the SOURCE TEXT and not the `imports` array.** The
 * hazard is a require-time one: TypeScript emits every `require()` at the top
 * of the module in **import-statement** order, and all of them complete
 * before the `@Module({...})` object literal — and therefore the `imports`
 * array — is ever constructed. So the array order **cannot** influence the
 * require order. An earlier version of this gate lived in
 * `result-innovation-use.module.compile.spec.ts` and asserted
 * `imports.indexOf(ResultsModule) < imports.indexOf(ResultInnovationUseModule)`.
 * **Measured 2026-09-09: that gate is blind.** Moving only the *import
 * statement* (leaving the array untouched) reverses the real require order and
 * it stayed 4/4 green — so its apparent falsifier had been firing on the
 * non-causal half of the mutation. Statement order is the causal list, so
 * statement order is what this reads.
 *
 * **The hazard.** `result-innovation-use.module` imports `LinkResultsModule`
 * (added by T-05), which reaches `results.module` → `result-policy-change.module`
 * → back to `link-results.module` **while it is still in flight**, leaving
 * `ResultPolicyChangeModule.imports[0] === undefined`. Production is safe only
 * because this file requires `results.module` first, which loads that whole
 * subtree before `result-innovation-use.module` is entered. That ordering was
 * incidental before T-05 and is load-bearing after it.
 *
 * **It also holds up a design decision.** DD-9's one-sided `forwardRef` (this
 * module wrapped; `results.module.ts:77` / `results.service.ts:152` plain) is
 * sufficient *because of this order*: measured in it, `ResultsService`'s 39
 * emitted paramtypes carry no `undefined`. Reverse the order and the erasure
 * moves to `ResultsService`'s own slot instead.
 *
 * FALSIFIER, observed red 2026-09-09: move the `results/results.module` import
 * statement below the `result-innovation-use/result-innovation-use.module` one,
 * leaving the `imports` array alone. This spec goes red; the old array-order
 * gate did not.
 */
describe('EntitiesModule — T-05 boot-order invariant (R-8)', () => {
  it('requires results.module BEFORE result-innovation-use.module (import-statement order)', () => {
    const source = readFileSync(join(__dirname, 'entities.module.ts'), 'utf8');

    const resultsAt = source.indexOf("from './results/results.module'");
    const innovUseAt = source.indexOf(
      "from './result-innovation-use/result-innovation-use.module'",
    );

    expect(resultsAt).toBeGreaterThanOrEqual(0);
    expect(innovUseAt).toBeGreaterThanOrEqual(0);
    expect(resultsAt).toBeLessThan(innovUseAt);
  });
});
