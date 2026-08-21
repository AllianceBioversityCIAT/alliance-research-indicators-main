# Archive Summary — CLARISA projects phase as an admin-editable variable

## 1. Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/bilateral/clarisa-phase-config-variable` |
| Archive date | 2026-08-18 |
| Depth | Standard |
| Type | Change |
| Approval Mode | `gated` |
| Final status | **Complete** — all tasks resolved, verified end to end in a live environment |

## 2. Outcome

An admin can now set the CLARISA project phase from `/administration/configuration/variables` with **no deploy**, choosing from a year selector populated by live CLARISA data.

The defect that motivated the spec is closed: the bilateral picker was empty because no `app_config` row existed, so `MappingPhaseResolver` fell through to the literal `DEFAULT_CLARISA_MAPPING_PHASE = 2026` while the CLARISA test feed carried only `2025`. With the row applied and set to `2025`, the picker returns **25 projects** — matching the independently measured eligible cohort.

## 3. Requirements Delivered

| ID | Status | Delivered by |
| --- | --- | --- |
| `R-CPC-001` | ✅ | **Pre-existing merged work** (`8431dc4b`) — see the T-01 pivot |
| `R-CPC-002` | ✅ | Same, plus the untouched resolver |
| `R-CPC-003` | ✅ | T-02 (server derivation) + T-03 (client injection & empty states) |
| `R-CPC-004` | ✅ | T-03 |
| `R-CPC-005` | ✅ | T-04 |
| `NFR-CPC-001` | ✅ | Verified live — value took effect after the resolver's TTL |
| `NFR-CPC-002` | ✅ | Call-count assertion across a warm cache |
| `NFR-CPC-003` | ✅ | Allowed + denied cases against a real `RolesGuard` |
| `NFR-CPC-004` | n/a | Out of scope after the pivot — no migration authored here |

## 4. Files Changed

| Package | Files | Lines |
| --- | --- | --- |
| server | `clarisa-projects.service.ts`, `clarisa-projects.controller.ts`, `dto/clarisa-project-phase.types.ts`, 2 spec files, `.env.example` | ~323 |
| client | `edit-environment-variable-modal.{ts,html,spec.ts}`, `bilateral-project-mapping.interface.ts`, `api.service.ts` | ~397 |

**~720 LOC total** against a ~380 budget — see §7.

## 5. Test Evidence

**No `test-report.md` — absence explicitly accepted by the user at archive time.** The spec was not run through `/akili-test`. What exists instead:

- **476 lines of tests**, authored per task and audited by an independent Reviewer on a different model.
- **Clause-level coverage**: 13 clauses across T-02 (5 rows) and T-03 (8 rows), each mapped to a named test — not requirement-ID presence.
- Server suite **2271 passing** (+10 over the 2261 baseline, a delta the Reviewer verified independently rather than accepting).
- Client suite **6402/6405**; the 3 failures are pre-existing and environment-dependent (`environment.ts` is gitignored/machine-local), confirmed by the Leader against the diff.
- `npm run build` green — the client's only real type gate (K-002).

**Known gap:** no e2e case for the new public route `/phases`. The server guide §4 step 5 asks for one; the sibling `bilateral` route has none either, so local practice is consistent. Recorded by the Reviewer as advisory, not a FAIL.

## 6. Validation Summary

**No `validation-report.md` — absence explicitly accepted by the user at archive time.** In its place:

- Every task passed an independent Reviewer (`opus`, read-only, ≠ the `sonnet` Implementer — `author ≠ auditor` on both axes).
- **Human visual check completed** on the four-item D-7 checklist, including advisory R2, which was checked and **did not materialise** (the field displays the label `2025 (25)`; the stored value is `"2025"`, verified by direct DB query).
- **End-to-end confirmation in a live environment**: 25 projects returned, matching the independently measured cohort.

## 7. Accepted Warnings & Follow-Ups

| # | Item | Disposition |
| --- | --- | --- |
| 1 | **Budget exceeded: ~720 LOC vs ~380 (+90%)** | Escalated, not absorbed. Cause is test volume, not scope creep — 476 lines are tests, because the clause-coverage tables demanded one per scenario **and** per `BUT`/`AND IT MUST` clause. Production code came in at ~244 vs an implied ~160. **The mis-estimate is in the spec-authoring step, not execution** |
| 2 | **The dev CI/CD pipeline does not apply migrations** | Measured, not inferred: the seed migration sat unapplied in `origin/dev` for 4 days across multiple deploys, with a baseline/post-measurement around one of them showing zero delta. **Outside this spec — open with DevOps** |
| 3 | 5-minute resolver TTL is a UX trap | Spec-conformant (`NFR-CPC-001`) but the first real user hit the loop. Candidate for a follow-up spec |
| 4 | Client swallows API errors into an empty list | Pre-existing, out of scope. `bilateral-mapping.service.ts` renders a failed request as "No results found" — the pattern that made the original defect invisible. T-03 deliberately did not repeat it |
| 5 | No e2e for `/phases` | Advisory; local practice consistent |
| 6 | `package.json` declares `migration:scan` but `scripts/scan-migration-placeholders.js` does not exist | Discovered incidentally. Consistent with K-006's record that the scanner was withdrawn — but its npm script was not removed |
| 7 | `OQ-3` — should `phase: null` keep meaning "matches everything"? | Deferred to a future spec. It is why production has never exercised this filter |

## 8. Historical Notes

### The pivot — the spec's own premise was false

`T-01` was dropped. The spec asserted the `app_config` row "has never existed" and that creating it was this spec's job. A migration creating it was **already merged** (`8431dc4b`, 2026-08-14) — its commit message is almost word for word this spec's stated intent. It had simply never been **applied**.

Found by the T-01 Implementer, which honoured its mandated blast-radius check, stopped before writing anything, and touched no database. The root cause was the Leader's own: a prior-art search during `/akili-propose` ran `grep -rln "app_config" src/db/migrations/ | tail -6` against **nine** matching files, and the silent cap dropped exactly the one that mattered.

### T-04 — a 10-line comment that took all three attempts

Its gate was *truth, not presence*. Two Reviewer FAILs, both correct, both factual errors a grep would have passed: first claiming a non-numeric env value falls back to `2026` (it **throws**), then over-correcting to claim `2026` is reached *only* when both sources are unset (a non-numeric, inactive, missing or unreadable row also reaches it). The resolver gives Tier 2 and Tier 3 **opposite** failure semantics.

### The reversion challenge changed the design

`R-CPC-004` replaced a free-text field with a selector — a removed capability. The mandated challenge asked what that breaks and found a real case: at a portfolio rollover nobody could pre-set a year CLARISA has not yet published, and the workaround would be a DB write. Result: `DD-3`, an `editable` select, verified against the installed PrimeNG 19.0.6 rather than assumed.

### What made the picker empty, finally

Measured across both CLARISA hosts on 2026-08-18: the same 25 eligible projects exist in each, but **test populates `phase` (2025) while production leaves it `null`**. `matchesPhase` treats `null` as a wildcard, so the phase filter has **never actually filtered in production** — local worked by accident. The day production starts populating `phase`, production behaves exactly as dev did.
