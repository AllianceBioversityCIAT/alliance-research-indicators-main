# Tasks — Bugfix / saveErrors self-reporting loop
- **Budget:** 1 task · ≈30 LOC. Commands from `client/research-indicators/`; `--coverage=false` (K-020).
### T-01 — Bypass predicate + null-safe errors, with regression test
- **Req:** R-SEL-001 (all clauses) · **Design:** DD-1, DD-2 · **Files:** `src/app/shared/interceptors/http-error.interceptor.{ts,spec.ts}` only.
- **Regression test (RED first, quote it):** with `environment.saveErrorsUrl` stubbed to `/save-errors-test/`: fire one request that fails 500; flush the resulting `saveErrors` POST with 504 + `null` body; assert `httpMock.match(r => r.url.startsWith('/save-errors-test/')).length === 1` and no error thrown (on HEAD: a 2nd saveErrors request appears / TypeError). Healthy path: endpoint 200 → still exactly one report. Original request's toast still emitted.
- **Done:** targeted jest green after red; `npm run build`; spec-tsc = 938; bare eslint. **Disqualifier:** a test that never flushes the saveErrors 504 cannot observe the recursion (KZ-017) — it must.
- Skills: `angular-developer`, `tdd`, `error-handling-patterns` · Effort: medium · **Status:** done
