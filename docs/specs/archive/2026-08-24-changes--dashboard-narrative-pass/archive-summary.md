# Archive Summary — Dashboard Narrative Pass (Project Dashboard v3.1)

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/dashboard-narrative-pass/` |
| Archive date | 2026-08-24 |
| Final status | **Complete — 7/7 tasks PASS, owner HITL approved (finding 1 remediated in-run)** |
| Branch | `bilateral-visual-improvements` (spec branch — shared-doc syncs recorded as kaizen pending items) |
| Origin | Escalated from `/akili-quick` (triviality gate failed) → proposal → Full-depth spec, same day |

## 2. Outcome

The project dashboard reads as a six-act data story: (1) Identity & health — hero with integrated status semaphore; (2) Production — the FIXED Results-over-time chart (series-render crash removed, SSR regression harness) + indicators; (3) Reach — geo + rankings migrated to viz-chart; (4) Direction — levers/SP/SDG; (5) Quality — evidence/review/reach; (6) Depth — deep-dive/keywords/pending. One declared visual language (chart idiom registry in `docs/ux-ui/design.md` §8); F4 insight cards split across acts over ONE deduped fetch (race guard, red-first); heatmap labels contrast-correct per cell.

## 3. Requirements delivered

R-DN-001 (bug fixed + regression red→green, owner-verified on real data) · R-DN-002 (23-surface inventory closed; migration + declared idioms; §8 registry) · R-DN-003 (6 acts, question subtitles, first-paint unchanged) · R-DN-004 (siblings intact; drills/tri-states preserved) · NFR-DN-001…004 (requests unchanged, bundle 1.12 MB = baseline +10 B, coverage 97.91/92.23/97.34/98.28, HITL light+dark).

## 4. Files changed (9 commits `94a4f192`…`c31ac068`)

Client only: `results-trend-card.*` (+ssr.spec), `geo-scope-card.*`, `project-dashboard.component.*`, `insights-section.*`, `docs/ux-ui/design.md` §8. No API/DTO/server changes.

## 5. Test evidence (embedded — no separate test-report.md, accepted)

Final: client 319 suites / 6787 tests, coverage floors ✓, build 0 errors, tsc-spec 937 = baseline, tokens PASS, K-004 reds observed for every named failing input (incl. 3 on the HITL fix). Rework: 1 round (T-06 ×1); every other task first-pass.

## 6. Validation

Owner HITL in-session: viz-bar token colors confirmed (clearing T-03 adv. 1's var()-in-SVG question empirically for live DOM), trend verified working, heatmap finding remediated + Reviewer PASS, remaining checks approved ("todo lo demás se ve bien").

## 7. Accepted follow-ups (recorded; outside this spec)

`insights-section` treemap still feeds `var()` literals (renders fine live; D-DN-5 trap for SSR contexts) · mid-ramp heatmap cells: bucket-vs-interpolation mechanism known if ever flagged · `parseRgb` duplication lift-point · dead `project-dashboard-card` layouts (3 branches) cleanup · `hasVisibleRankingCards` test retitle · template array-literal CD churn hoist · heatmap-style axis `var()` literals in the other 4 bar builders (render fine live, owner-verified).

## 8. Historical notes

Two account-session-limit interruptions parked and resumed with zero attempt loss (winding-down protocol, second proven use). LOC ≈ +2,900 vs ~1,150–1,650 estimate — recurrence of F4's test-heavy calibration miss (kaizen digest-update recorded). The T-07 HITL finding was remediated inside the run: gate → finding → bounded fix → review → close, same day.
