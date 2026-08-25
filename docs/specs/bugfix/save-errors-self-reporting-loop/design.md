# Design — Bugfix / saveErrors self-reporting loop
- Lite · Bug Mode · gates auto-approved
- DD-1: single predicate `isErrorReportingRequest(req)` = `req.url.startsWith(environment.saveErrorsUrl) || req.url.includes('ciat-errors.yecksin.workers.dev')`; used for the early `return next(req)` at the top (replaces the hostname-only check). Keeps K-005's rule: `saveErrorsUrl` stays a distinct branch selector.
- DD-2: `error.error?.errors ?? error.message` at both toast sites — null-safe, message preserved.
- Reversion challenge: nothing removed. **Budget: 1 task · ≈ 30 LOC · 1 round.**
