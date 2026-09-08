# T-06 artifact — the HTTP suite that could not be landed

`coverage-report.http.spec.ts.wip` is the working state of **T-06** after **six attempts**. It is
kept here, outside `src/`, so it does not run as a test and does not redden the branch — while
staying recoverable for whoever picks T-06 up.

## What is CORRECT in it — verified repeatedly, do not redesign

- The bootstrap replicates `main.ts` exactly: `app.setGlobalPrefix('api')` **and**
  `app.enableVersioning({ type: VersioningType.URI })`. This is what makes the asserted path real.
- The asserted path is `/api/bilateral-project-mappings/coverage-report` — **no `/v1`**, because
  versioning is enabled with no `defaultVersion` and the controller declares no `@Version`.
- The three scenarios are the right three: route resolution (D10), the 403 envelope (D6), and
  singleton identity across two requests (D11).
- A `@Global() MockDbModule` resolves `DataSource` across the graph, and the real
  `BilateralProjectMappingModule` is imported — which is what keeps the singleton assertion meaningful.

## Why it does not run

```ts
export class BilateralProjectMappingRepository extends Repository<BilateralProjectMapping> {
  constructor(dataSource: DataSource) {
    super(BilateralProjectMapping, dataSource.createEntityManager());
  }
}
```

A **real TypeORM `Repository` subclass**. Its `super()` needs an `EntityManager` carrying live
connection metadata. The recurring `TypeError: Cannot read properties of undefined (reading 'find')`
is TypeORM looking up `entityMetadatas`. **No `DataSource` double is deep enough** — attempts 2–5
each enriched the mock and each surfaced the next layer; attempt 6 overrode the repository itself
(the right move) and still failed.

## The shortcut that was refused, and must stay refused

Replacing the real module with hand-provided doubles — `{ provide: BilateralMappingCoverageService,
useValue: {...} }` — makes it compile and pass **and destroys the point**. With a `useValue` service,
two requests trivially share one object, so the singleton assertion (D11) reports green while proving
nothing. A declared gap beats a decorative gate.

## What is still uncovered because this did not land

| Defect | Status |
| --- | --- |
| D10 route shadowing | Mitigated by inspection — handler at controller line 78, `@Get(':id')` at 112, with an explanatory comment in the code |
| D11 `Scope.REQUEST` cascade | Mitigated by inspection — constructor and module verified; warning comment in the module header |
| **D6 — the 403 envelope** | **UNCOVERED.** The existing controller spec asserts the guard is *present* (`expect(g).toBe(RolesGuard)`), which stays green if `@Roles` is deleted |

## Plausible next directions

1. A real `TypeOrmModule.forRoot()` against `better-sqlite3`/in-memory, so entity metadata exists.
2. Move to the e2e config (`test/jest-e2e.json`) where a real datasource is available.
3. Build the app from a purpose-made test module that declares the controller and coverage service
   directly **but registers the coverage service as a normal class provider** (not `useValue`), so
   singleton identity is still genuine.

Option 3 is the cheapest and preserves what matters. It was not attempted before the run stopped.
