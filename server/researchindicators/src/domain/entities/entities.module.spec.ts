import 'reflect-metadata';
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
