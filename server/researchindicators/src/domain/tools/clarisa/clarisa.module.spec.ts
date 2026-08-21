import 'reflect-metadata';
import { AppModule } from '../../../app.module';
import { ClarisaModule } from './clarisa.module';
import { ClarisaInnovationUseLevelsModule } from './entities/clarisa-innovation-use-levels/clarisa-innovation-use-levels.module';

/**
 * T-01 reopen (DD-15, tasks.md trap 4, KZ-001).
 *
 * `RouterModule.register()` never instantiates the modules it names — it
 * only stamps `MODULE_PATH` metadata onto the constructor and looks it up
 * in `modulesContainer`, returning silently when absent (verified at
 * source in `@nestjs/core/router/router-module.js`). The only thing that
 * actually instantiates a module is the `imports` array of a module already
 * in the graph. A spec asserting the shape of `clarisaRoutes` (or
 * `main.routes`'s `route` array) never evaluates that — it is the stand-in
 * KZ-001 warns about. This file asserts the real thing: module-graph
 * membership, read via `Reflect.getMetadata('imports', <ctor>)`, walked
 * transitively from `AppModule` so a future de-registration of
 * `ClarisaModule` itself (the same class of defect one level up) also
 * fails this spec, not just a de-registration of the leaf module.
 *
 * This does not boot Nest's DI container or a `TestingModule` — it only
 * reads the static `@Module()` metadata Nest's compiler attaches to each
 * class at decoration time via `reflect-metadata`, which is why it is safe
 * to import `AppModule` here without a database connection: nothing calls
 * `NestFactory.create` / `Test.createTestingModule(...).compile()`, so
 * `TypeOrmModule.forRoot(...)`'s options are constructed but never used to
 * open a connection.
 */

type ModuleEntry = unknown;

interface DynamicModuleLike {
  module: NestModuleClass;
}

interface ForwardReferenceLike {
  forwardRef: () => ModuleEntry;
}

type NestModuleClass = new (...args: unknown[]) => unknown;

function isForwardReference(entry: ModuleEntry): entry is ForwardReferenceLike {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof (entry as ForwardReferenceLike).forwardRef === 'function'
  );
}

function isDynamicModule(entry: ModuleEntry): entry is DynamicModuleLike {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof (entry as DynamicModuleLike).module === 'function'
  );
}

/**
 * Resolves one `imports` array entry down to a module class, or `undefined`
 * when the entry carries no class to walk into (e.g. a dynamic module built
 * from `providers`/`exports` alone, with no `module` key — none exist in
 * this graph today, but the walk must not throw if one appears).
 */
function resolveModuleClass(entry: ModuleEntry): NestModuleClass | undefined {
  if (typeof entry === 'function') {
    return entry as NestModuleClass;
  }
  if (isForwardReference(entry)) {
    return resolveModuleClass(entry.forwardRef());
  }
  if (isDynamicModule(entry)) {
    return entry.module;
  }
  return undefined;
}

/**
 * Depth-first reachability walk over the `imports` graph rooted at `root`,
 * guarded against cycles (e.g. `ResultsModule` <-> `ResultOicrModule` via
 * `forwardRef`) with a visited set.
 */
function isReachable(root: NestModuleClass, target: NestModuleClass): boolean {
  const visited = new Set<NestModuleClass>();
  const stack: NestModuleClass[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (current === target) {
      return true;
    }

    const imports: ModuleEntry[] =
      Reflect.getMetadata('imports', current) ?? [];
    for (const entry of imports) {
      const resolved = resolveModuleClass(entry);
      if (resolved && !visited.has(resolved)) {
        stack.push(resolved);
      }
    }
  }

  return false;
}

describe('ClarisaModule — innovation-use-levels registration (DD-15)', () => {
  // Direct membership: the minimum this task's Done criterion asks for.
  it('lists ClarisaInnovationUseLevelsModule in its own imports metadata', () => {
    const imports: unknown[] = Reflect.getMetadata('imports', ClarisaModule);

    expect(imports).toContain(ClarisaInnovationUseLevelsModule);
  });

  // Transitive: closes the class of defect one level up (an unregistered
  // ClarisaModule would still pass a ClarisaModule-only assertion).
  it('is reachable from AppModule through the real module graph', () => {
    expect(isReachable(AppModule, ClarisaInnovationUseLevelsModule)).toBe(true);
  });
});
