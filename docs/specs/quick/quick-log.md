# Quick Changes Log

One-line record of trivial, fast-tracked changes made with `/akili-quick`.

| Date | Change | Files | Verification | Commit |
|---|---|---|---|---|
| 2026-07-22 | quick/readme-monorepo-scope — reconcile README with the monorepo constitution: client no longer "out of scope", add infrastructure.md + model-routing.md to the docs map, add client child guide, update repo-layout tree | README.md | link targets verified to exist; no scope contradictions remain | [SPEC:quick/readme-monorepo-scope] |
| 2026-08-13 | quick/capdev-email-url-source — add `source=star` to the CapDev bulk-upload email link so it lands on the results that upload created. Slug derived via `ReportingPlatformEnum.STAR.toLowerCase()`, matching the client's own lower-cased-`platform_code` rule rather than a third hard-coded spelling. The `indicatorTab=1` → `indicator`/`contract` half was **already** delivered by T-10 (`ba5a90ee`) of the now-archived `results-center/url-filters`; the reported email came from the deployed test env running older code. D6's twin-literal control extended on the client so it still covers the full string as sent. **Scoping confirmed by the product owner:** the bulk upload never creates results on another platform, so `source=star` describes exactly the set the email is about and hides none of it | `server/…/capdev-bulk-notification.service.ts` (+ `.spec.ts`), `client/…/results-center-url.codec.spec.ts` | server 328 suites / 2,217 tests · client 309 suites / 6,508 tests · server lint clean | [SPEC:quick/capdev-email-url-source] |
