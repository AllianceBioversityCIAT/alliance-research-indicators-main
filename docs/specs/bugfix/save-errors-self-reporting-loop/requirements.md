# Requirements — Bugfix / `saveErrors` self-reporting loop in `httpErrorInterceptor`
- **Type:** Bug · **Depth:** Lite (Bug Mode) · **Approval:** owner 2026-08-25 ("ye"); gates auto-approved
- **Root cause (confirmed live 2026-08-25 on localhost:4200, 1,000+ console errors):** `http-error.interceptor.ts` excludes error-reporting requests only by the hard-coded prod host `ciat-errors.yecksin.workers.dev` (line 17). Locally `environment.saveErrorsUrl` is `/save-errors-unavailable-local/` (504) → every failed `saveErrors` POST re-enters `catchError` → `api.saveErrors()` again → unbounded recursion; and the single toast site (line ~85) reads `error.error.errors` where `error.error` is `null` on a 504 → `TypeError`. Same trap the child guide documents (K-005) — this hardens it so it cannot recur in any environment where the error endpoint is down.

### R-SEL-001 — Error reporting never reports itself
The interceptor SHALL bypass its error-reporting (and timeout-reporting) for any request whose URL starts with a **non-empty** `environment.saveErrorsUrl` OR contains the prod host (an empty `saveErrorsUrl` MUST NOT bypass anything), and SHALL read `error.error?.errors` null-safely.
#### Scenario: save-errors endpoint down
- GIVEN `saveErrorsUrl` responds 504 (body null)
- WHEN any app request fails
- THEN exactly ONE `saveErrors` POST is attempted for that failure
- AND no `TypeError` is thrown from the interceptor
- BUT it must NOT suppress the toast/handling for the original failing request
- AND IT MUST still report failures of normal requests when the endpoint is healthy.

## Defect class → gate: recursion → interceptor spec with `HttpTestingController`: one failing app request + failing saveErrors → assert exactly one saveErrors request (**red on HEAD: ≥2 / unbounded**); null body → no throw.
