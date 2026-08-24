# Tasks — Innovation Use / Stale justification on level drop

- **Module:** results (`result-innovation-use`)
- **Spec id:** 2026-08-innovation-use-stale-justification
- **Status:** done
- **Owner:** Engineering / product owner
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked design:** [`./design.md`](./design.md)
- **Linked proposal:** [`./proposal.md`](./proposal.md)
- **Last updated:** 2026-08-24

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/innovation-use-stale-justification` |
| **Depth** | Lite · Bug Mode |
| **Budget** | **1** task · **~220** LOC · **~2** review rounds (`design.md` §10) |
| **Tripwire** | Actuals above **~320** net LOC or beyond **4** review rounds → stop `/akili-execute` and escalate |
| **Concurrency** | One task, server package only. Do not run a second full server suite in parallel (root `CLAUDE.md` §4.3) |
| **Deployment** | Server-only. No client coupling. No migration. No flag |
| **Judgment Day** | Not run — user chose Continue from Phase 2 |

---

## 2. Dependency graph

- `T-01` (fixture F1 red → persist rule → F2/F3/AC.4 green → docs) → done

---

## 3. Task list

### T-01 — Clear `innovation_use_level_explanation` when effective catalog `level` is `< 6` or absent

- **Status:** `[x]` done · **Size:** S · **Dependencies:** none
- **Requirements covered:** R-IUJ-001 (AC.1–AC.5 + all three scenario `BUT` / `AND IT MUST`), R-IUJ-002 (AC.1–AC.3 + scenario `BUT` / `AND IT MUST`), NFR-IUJ-001, NFR-IUJ-002
- **Design references:** §4, DD-1…DD-7, §7
- **Skills:** `nestjs-expert` · `tdd` (Bug Mode red→green) · `systematic-debugging` (on any failure)

**Files touched (intended)**

- `server/researchindicators/src/domain/entities/result-innovation-use/result-innovation-use.service.ts` — capture `resolveInnovationUseLevel`’s return; on the existing scalar write, pass `null` for the explanation when that return is `undefined` or `< 6`; otherwise pass the DTO value as today.
- `server/researchindicators/src/domain/entities/result-innovation-use/result-innovation-use.service.spec.ts` — unit cases for the choice (DD-6: **not** Bug-Mode evidence).
- `server/researchindicators/test/fixtures/innovation-use/innovation-use-section-round-trip.fixture-spec.ts` — add F1, F2, F3, AC.4. Keep the existing DD-14 omitted-key `it` (F4) unmodified.
- `docs/specs/innovation-use/family.md` — one **Cross-cutting Risks** row (`FR-11`). Not a Children row.
- `docs/specs/innovation-use/OPEN-ITEMS.md` — §0 **N-2** points at this spec.

**Catalog ids** (family D-1, migration-seeded `id = level + 1`): level **2** → id **3**; level **5** → id **6**; level **6** → id **7**. Compare `level`, never the FK.

**Do not**

- Touch any file under `client/`.
- Add a migration or backfill.
- Restore `validateLevelExplanation`.
- Compare `innovation_use_level_id >= 6`.
- Fold the cases into `innovation-use-level-boundary.fixture-spec.ts`.
- Rewrite the existing DD-14 `it` or the draft-save `''` / `'   '` cases at `level >= 6`.
- Cite a unit-spec green as R-IUJ-001 evidence (DD-6).
- Treat deleting `_effectiveExplanation` as a done-criterion (permitted, not required).

**Order of work (Bug Mode)**

1. Add **F1** to the round-trip fixture first. Expected value is always `NULL` on the raw `SELECT` (do **not** write `expect(oldText)` and flip it).
2. Run the targeted fixture command **before** changing `update` — F1 MUST be red (column still holds the seed text).
3. Implement the persist rule (DD-2, DD-3).
4. Re-run — F1 green. Same expect.
5. Add F2, F3, AC.4 (same `toBeNull()` on the column). Re-run the file.
6. Confirm F4 and the existing `''` / `'   '` cases still pass without edits.
7. Optional unit cases. Docs rows. Full server suite in a quiet window.

**Targeted command** (from `server/researchindicators/`, scratch MySQL already bootstrapped):

```bash
npm run test:fixtures -- --testPathPattern=innovation-use-section-round-trip
```

**Done criteria** (one clause per row)

- [x] c1 — **Bug Mode RED (F1).** On current HEAD, the targeted command fails because a raw `SELECT` of `innovation_use_level_explanation` after `PATCH { innovation_use_level_id: 3, innovation_use_level_explanation: "<seed text>" }` (stored catalog id **7** + that same text) is **not** `NULL`. Record the run verbatim (NFR-IUJ-002, R-IUJ-001 AC.1).
- [x] c2 — **Bug Mode GREEN (F1).** After the persist rule, the same `SELECT` is `NULL`, the service call did not throw, and GET/return `innovation_use_level_explanation` is `null`. Same expect as c1. Record the run verbatim (R-IUJ-001 AC.1; scenario **BUT** must NOT `400`).
- [x] c3 — F1 also asserts the stored `innovation_use_level_id` is **3** (R-IUJ-001 scenario **AND IT MUST** persist the new level).
- [x] c4 — **F2.** Same seed; `PATCH { innovation_use_level_id: 3 }` with **no** explanation key; raw `SELECT` is `NULL` (R-IUJ-001 AC.2).
- [x] c5 — **F3.** Same seed; `PATCH { innovation_use_level_id: 6 }` (catalog id 6 = level **5**); raw `SELECT` is `NULL` (R-IUJ-001 AC.3; scenario **AND IT MUST** decide from `level`; **BUT** must NOT keep the text).
- [x] c6 — **AC.4 present-null.** Same seed; `PATCH` with `innovation_use_level_id: null`; raw `SELECT` is `NULL` (R-IUJ-001 AC.4).
- [x] c7 — **AC.4 no stored level.** A row with `innovation_use_level_id` NULL and a non-blank explanation; `PATCH` that omits the explanation key (may change an unrelated collection field); raw `SELECT` is `NULL` (R-IUJ-001 AC.4).
- [x] c8 — F1 (or F2) asserts a sentinel actor / organization / quantification value from the seed is unchanged by the clear (R-IUJ-001 AC.5).
- [x] c9 — Existing DD-14 `it` (PATCH omitting the explanation, catalog id **7** kept, actor count changed) is **unmodified** and still green; raw `SELECT` of the explanation is still the seed text (R-IUJ-002 AC.1, AC.3; scenario **BUT** must NOT write `NULL` on that path).
- [x] c10 — Existing `''` and `'   '` cases at stored level ≥ 6 in this fixture file are **unmodified** and still green (R-IUJ-002 AC.2; scenario **AND IT MUST** leave draft-save intact).
- [x] c11 — `git diff --exit-code -- client/` and no new file under `server/researchindicators/src/db/migrations/` (NFR-IUJ-001).
- [x] c12 — `family.md` **Children** table has no new row. The new row is **FR-11** under **Cross-cutting Risks**, pointing at this spec, owner `none`.
- [x] c13 — `OPEN-ITEMS.md` §0 **N-2** cites `docs/specs/bugfix/innovation-use-stale-justification/`.
- [x] c14 — Full server suite `npm test -- --silent` from `server/researchindicators/` (coverage ≥ 60%). Then `npx eslint` on the touched production + spec paths (not `npm run lint` as the gate — K-001). Re-inspect `git status` if a fixer was used.

**Falsifying input** (named before the test exists — K-012)

- Restore DTO passthrough on the explanation write: **c2 MUST FAIL**. If c2 still passes, F1 is not reading the column.
- Implement “clear only when the explanation key is present”: **c4 MUST FAIL**; c2 may pass — that is D2, not a close.
- Implement `if (innovation_use_level_id >= 6)` on the FK: **c5 MUST FAIL**; c2 may pass — that is D3.
- Write `null` whenever the explanation key is omitted, ignoring level: **c9 MUST FAIL**.
- Skip c1 and cite only a unit spec that the mock `update` was called with `null`: **NFR-IUJ-002 is not evidenced** (D5).

**Disqualifiers**

| Signal | Disqualifier |
| --- | --- |
| c1 / c2 | Writing `expect(seedText)` then flipping to `toBeNull()` after the fix is not Bug Mode (KZ-014). Both runs use `toBeNull()` |
| c1 | A reasoned “would be red” with no recorded fixture run (KZ-014 / K-004) |
| c1 | `npm test` cited as the Bug-Mode gate — that config cannot see `test/fixtures` (KZ-017) |
| c2 | A `400` on F1 — the clear is a write, not a rejection (R-IUJ-001 **BUT**) |
| c4 | Ticking F2 while F1 (c2) is still red (scenario **BUT** not “fixed” if STAR shape still fails) |
| c5 | Asserting only that catalog id 6 is “accepted”; the column must be `NULL` |
| c8 | Asserting `update()` was called with three collection arrays — that is call-sequence, not the stored sentinel (KZ-001) |
| c9 / c10 | Editing those existing `it`s to stay green |
| c11 | Any client byte or new migration |
| c12 | A new **Children** row |
| c14 | A filtered `npm test` is **inconclusive** (KZ-003). The targeted fixture command evidences c1–c10 only |
| New fixture file | Allowed only if the round-trip file cannot host the cases; then grep every `*.fixture-spec.ts` header and take the next unused band (**re-grep**, do not copy `903_000` from the proposal) |

---

## 4. Requirement → task coverage, at clause level

Requirement-ID presence is not closure. Every AC and every `BUT` / `AND IT MUST` is owned below.

| Requirement | AC / clause | Owner |
| --- | --- | --- |
| R-IUJ-001 | AC.1 STAR shape → column `NULL`, `2xx` | **T-01** c1, c2 |
| R-IUJ-001 · sc STAR | **BUT** must NOT `400` | **T-01** c2 |
| R-IUJ-001 · sc STAR | **AND IT MUST** persist the new `innovation_use_level_id` | **T-01** c3 |
| R-IUJ-001 | AC.2 omitted-key → `NULL` | **T-01** c4 |
| R-IUJ-001 · sc omitted | **BUT** not “fixed” if STAR shape still fails | **T-01** c4 disqualifier (c2 must be green first) |
| R-IUJ-001 | AC.3 catalog id 6 (level 5) → `NULL` | **T-01** c5 |
| R-IUJ-001 · sc id 6 | **AND IT MUST** decide from catalog `level` | **T-01** c5 + FK falsifier |
| R-IUJ-001 · sc id 6 | **BUT** must NOT keep the text | **T-01** c5 |
| R-IUJ-001 | AC.4 no effective level → `NULL` | **T-01** c6, c7 |
| R-IUJ-001 | AC.5 other columns follow today’s rules | **T-01** c8 |
| R-IUJ-002 | AC.1 omitted key at level 6 preserves | **T-01** c9 |
| R-IUJ-002 | AC.3 existing DD-14 fixture stays green | **T-01** c9 |
| R-IUJ-002 · sc | **BUT** must NOT write `NULL` on that path | **T-01** c9 |
| R-IUJ-002 | AC.2 `''` / `'   '` at `>= 6` persist verbatim | **T-01** c10 |
| R-IUJ-002 · sc | **AND IT MUST** leave draft-save intact | **T-01** c10 |
| NFR-IUJ-001 | no client, no migration | **T-01** c11 |
| NFR-IUJ-002 | column-level red then green | **T-01** c1, c2 |

**8 of 8 scenario clauses owned. 8 of 8 ACs owned. 2 of 2 NFRs owned.**

---

## 5. Sequencing and PR strategy

One task, one PR, server-only. Below the ~400 LOC split line.

Suggested title: `fix(result-innovation-use): clear justification when use level drops below 6`.

Backout: revert the commit. Rows already saved as `NULL` stay valid.

---

## 6. Not in this spec

| | |
| --- | --- |
| Any `client/` edit | Product owner; R-IUP-006 AC.3 stays |
| Other conditional fields | Product owner: justification only |
| Backfill of inconsistent rows | A-1 |
| Green-check SQL / `validateLevelExplanation` / D2 / P1 | Out of blast radius |
| `_effectiveExplanation` deletion as a gate | Permitted in the same method; not a criterion |
| Judgment Day | User skipped Review Design at Phase 2 |

---

## 7. Risks & blockers log

| # | Date | Risk / Blocker | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RB-1 | 2026-08-24 | F1 green with F3 unwritten = FK-threshold false close | c5 is mandatory; FK falsifier in the task | engineering | open (design) |
| RB-2 | 2026-08-24 | `test:fixtures` needs the scratch MySQL | Family harness; no waiver; c1 cannot be claimed from `npm test` | engineering | open (process) |
| RB-3 | 2026-08-24 | Judgment Day skipped | User chose Continue. Reviewer at execute still runs | engineering | accepted |

---

## 8. Done definition

- [x] T-01 is `done` (Reviewer PASS in `execution.md` **before** any done-checkbox in this file).
- [x] All rows in §4 are evidenced.
- [x] Server coverage floor still green.
- [x] No migration, no Swagger delta, no client diff.
- [x] A-1 / A-2 remain as recorded in `requirements.md` §10.
