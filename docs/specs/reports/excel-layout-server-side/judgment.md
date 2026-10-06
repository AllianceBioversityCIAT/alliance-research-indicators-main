# Judgment Day — reports/excel-layout-server-side (design)

| Field | Value |
| --- | --- |
| Target | `design.md` against `requirements.md`, uncommitted at `7afcedfc` |
| Mode | judgment_day, round 1 |
| Judges | A and B, blind, read-only (`akili-reviewer` wrapper: Read/Grep/Glob, no shell, no DB) |
| Date | 2026-10-06 |
| Result | **0 severe** (A: 0 W6 S5 · B: 0 W6 S2) · re-judgment: **0 severe, 0 warning** — **APPROVED** |

## Premise Ledger attack

| Row | Judge A | Judge B |
| --- | --- | --- |
| P-1 | confirmed (files); `git log` not re-run; cite entry point `:58` not `:75-76` | confirmed (files); `git log` not re-run |
| P-2 | not re-run (DB); migration replay yields the 11-row layout | not re-run (DB); migrations agree |
| P-3 | not re-run (`origin/dev` only) | not re-run |
| P-4 | UNVERIFIED, not refuted | UNVERIFIED, not refuted |
| P-5…P-10 | confirmed | confirmed |
| Missing rows | sheet names used by handler-spec lookups; `STAR_RAW_SHEET_PREAMBLE_BASE` retype; builder banner clamp | literal-union key type; handler-spec breakage list; build type-checks `columns.ts` (checked: tsc builder, `tsconfig.build.json` excludes only specs) |

## Findings ledger (frozen)

| ID | Finding | A | B | Status |
| --- | --- | --- | --- | --- |
| J-1 | Compile gate holds only if the section key is a literal union (`as const satisfies …`, `keyof typeof`); a `Record<string, …>` makes `section` a plain `string` | W | W | **confirmed WARNING** |
| J-2 | Reversion challenge lists one breaking handler-spec case; also `getWorksheet('Raw')` at `:208/:279/:357` (name came from the mocked DB row), `:452-464` (fallback), `:541-560` (`FF1565C0` default), dead mocks `:232/:458/:547`; re-point merge checks `:292-295` | W | W | **confirmed WARNING** |
| J-3 | R-WBL-003 says the error names "the stray column" (the other section's column in between); design §3.3 names the reopening column | W | W | **confirmed WARNING** |
| J-4 | Budget parts sum to ~530, not ~450; sections spec not counted; prettier will expand column objects | W | W | **confirmed WARNING** |
| J-5 | Requirements §1 cites `sheet-presentation.ts:79`; the value is at `:80` | W | W | **confirmed WARNING** |
| J-6 | Requirements §1 points to "§3.2" for first/last keys; no such section | — | W | suspect (one judge) |
| J-7 | `withHeaderFills(columns: ExcelColumnSpec[])` would drop `section`; state the tagged signature | W | — | suspect |
| J-8 | §3.3/§9 throw a raw `Error` on the HTTP path; `src/CLAUDE.md:197` forbids it | — | W | suspect — rule verified at `src/CLAUDE.md:197` |
| J-9 | DD-7 requires `Omit<…,'columnGroups'|'bannerTitleMergeToCol'>` | S | S | info |
| J-10 | `WorkbookSheetRow` import becomes unused in the repository | S | — | info |
| J-11 | No explicit gate for "section appended", "column added", R-WBL-007 dictionary rows | S | — | info |
| J-12 | Dictionary section fills stay in DB and already differ from band colours (Evidences `FF5C7EC4` vs `FF64B1DD`) — record FU-3 | S | — | info |
| J-13 | P-1 citation should name `buildWorkbookSpec` | S | — | info |
| J-14 | R-WBL-005 "81 columns → 3–81" has no test; use a pure helper or synthetic array | — | S | info |

Per the contract, auto-fix covers severe findings confirmed by both judges only — there are none. Every row above is `info` unless the user chooses to fix it.

## Round 1 correction and scoped re-judgment

- **User choice (2026-10-06):** Fix and Re-judge. J-1…J-14 applied to `design.md` / `requirements.md`; P-11…P-13 added to the Premise Ledger.
- **Re-judgment (both judges, scoped to the frozen ledger + fix delta):** all 14 findings resolved by both; no fix-caused contradiction or broken count; 0 severe, 0 warning.
- **Suggestions from the re-judgment, applied:** handler-spec list completed (`:51-62`, `:77-84` stubs, providers `:95/:97`, title `:114`); P-11 citation `:51-62` and "If false" corrected (the read-backs throw, they do not pass silently); P-13 restated — the builder does not clamp the banner (`min(b, max(c, b)) = b`); requirements D2 aligned with R-WBL-003; banner end named once (the derivation's last column).

JUDGMENT: APPROVED ✅
