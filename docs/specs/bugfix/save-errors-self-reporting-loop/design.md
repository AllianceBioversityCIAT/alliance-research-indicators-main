# Design — Bugfix / saveErrors self-reporting loop
- Lite · Bug Mode · gates auto-approved
- DD-1 (**amended 2026-08-25 after Reviewer FAIL**): single predicate `isErrorReportingRequest(req)` = `(!!environment.saveErrorsUrl && req.url.startsWith(environment.saveErrorsUrl)) || req.url.includes('ciat-errors.yecksin.workers.dev')` — the empty-string guard is load-bearing: `'x'.startsWith('')` is always true and `environment.example.ts` ships `saveErrorsUrl: ''`, so the unguarded form silently disables the whole interceptor on a template-copied local env; used for the early `return next(req)` at the top (replaces the hostname-only check). Keeps K-005's rule: `saveErrorsUrl` stays a distinct branch selector.
- DD-2: `error.error?.errors ?? error.message` at the single toast site that reads `error.error.errors` (one exists — earlier "both/lines 40&75" wording was stale) — null-safe, message preserved.
- Reversion challenge: nothing removed. **Budget: 1 task · ≈ 30 LOC · 1 round.**
