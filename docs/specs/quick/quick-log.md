# Quick Changes Log

One-line record of trivial, fast-tracked changes made with `/akili-quick`.

| Date | Change | Files | Verification | Commit |
|---|---|---|---|---|
| 2026-07-22 | quick/readme-monorepo-scope — reconcile README with the monorepo constitution: client no longer "out of scope", add infrastructure.md + model-routing.md to the docs map, add client child guide, update repo-layout tree | README.md | link targets verified to exist; no scope contradictions remain | [SPEC:quick/readme-monorepo-scope] |
| 2026-08-14 | quick/sidebar-optional-after-submit — move the optional "Pool funding alignment" divider + section to render after the Review/Submit/Approve buttons in the result sidebar (was before the buttons) | client/research-indicators/src/app/shared/components/result-sidebar/result-sidebar.component.html | manual structure check (deps not installed locally); existing sidebar spec assertions preserved (divider+row kept siblings in a reused .options-container; array-last + hidden-when-ineligible unchanged); no TS/logic/contract change | [SPEC:quick/sidebar-optional-after-submit] |
| 2026-08-20 | quick/pool-funding-catalog-skeleton — upgrade legacy HLO catalog loading spinner in main page to structured PrimeNG skeleton loaders with design tokens | client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/pool-funding-alignment.component.html, pool-funding-alignment.component.ts | `npx jest` (350/350 passed) & `npx eslint` (0 errors) | [SPEC:quick/pool-funding-catalog-skeleton] |
| 2026-08-20 | quick/pool-funding-loading-copy — update ToC catalog loading banner text to reference PRMS instead of CLARISA | client/.../pool-funding-alignment.component.html, client/.../sp-toc-alignment-block.component.html, client/.../sp-toc-alignment-block.component.spec.ts | `npx jest` (350/350 passed) | [SPEC:quick/pool-funding-loading-copy] |
| 2026-08-20 | quick/pool-funding-sps-skeleton — add animated PrimeNG skeleton loaders for Science Programs section during initial fetch from CLARISA | client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/pool-funding-alignment.component.html, pool-funding-alignment.component.spec.ts | `npx jest` (351/351 passed) & `npx eslint` (0 errors) | [SPEC:quick/pool-funding-sps-skeleton] |
| 2026-08-20 | quick/hide-pool-funding-for-oicr — hide Pool Funding Alignment section in sidebar and redirect if accessed for OICR results (indicator_id === 5) | client/research-indicators/src/app/shared/components/result-sidebar/result-sidebar.component.ts, result-sidebar.component.spec.ts, client/.../pool-funding-alignment.component.ts | `npx jest` (99/99 and 351/351 passed) & `npx eslint` (0 errors) | [SPEC:quick/hide-pool-funding-for-oicr] |
| 2026-08-20 | quick/pool-funding-toc-info-banner — update general info banner and section label to reference Theory of Change results (Outputs, Outcomes) across all levels | client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/pool-funding-alignment.component.ts, pool-funding-alignment.component.html | `npx jest` (351/351 passed) & `npx eslint` (0 errors) | [SPEC:quick/pool-funding-toc-info-banner] |
| 2026-08-20 | quick/pool-funding-alerts-ux-modernization — modernize all informative, warning, error, and read-only banner styles with ARI design tokens and contextual icons | client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/pool-funding-alignment.component.html | `npx jest` (351/351 passed) & `npx eslint` (0 errors) | [SPEC:quick/pool-funding-alerts-ux-modernization] |
| 2026-08-20 | quick/sidebar-prms-sync-button — add PRMS SYNC button below Pool Funding Alignment in result sidebar, enabled when result is approved and pool funding is completed | client/research-indicators/src/app/shared/components/result-sidebar/result-sidebar.component.html, result-sidebar.component.ts, result-sidebar.component.spec.ts | `npx jest` (104/104 passed) & `npx eslint` (0 errors) | [SPEC:quick/sidebar-prms-sync-button] |
| 2026-08-21 | quick/pool-funding-toc-clarified-banner — clarify Pool Funding Alignment main banner copy to explain aligning with SP and contributing to ToC (Outputs, Outcomes) | client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/pool-funding-alignment.component.ts | `npx jest` (351/351 passed) & `npx eslint` (0 errors) | [SPEC:quick/pool-funding-toc-clarified-banner] |








