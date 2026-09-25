# Judgment Day — `innovation-use/link-innovation-dev` design review

| Field | Value |
| --- | --- |
| Target | `design.md` @ draft 1 (immutable at review time) |
| In-scope context | `requirements.md`, `proposal.md` |
| Mode | `judgment_day`, blind dual judge, round 1 |
| Author | Opus 5 (this session) |
| Judge A | **Fable 5.1** — lens: correctness & feasibility |
| Judge B | **Sonnet 5** — lens: coverage, consistency & risk |
| author ≠ auditor | **Satisfied** — both judges ran on models different from the author, and from each other |
| Round | 1 of a maximum 2 |
| Terminal state | **APPROVED (after round-1 correction)** |
| Date | 2026-09-09 |

---

## Verdict summary

| | Judge A | Judge B |
| --- | --- | --- |
| SEVERE | 1 | 4 |
| WARNING | 8 | 4 |
| SUGGESTION | 3 | 2 |
| **Total** | **12** | **10** |

**Corrections applied in round 1: 13.** One finding rejected on verification (B6). Draft 2 of
`design.md` supersedes draft 1.

---

## Frozen ledger

Severity below is the **merged** severity. "Both" = independently raised by both judges, which is the
corroboration mechanism. A single-judge finding is normally recorded as *suspect* and not auto-fixed
— the four marked **verified by author** were escalated to fix because the orchestrator reproduced
the evidence directly against source, which is stronger than corroboration.

| ID | Judges | Sev | Finding | Disposition |
| --- | --- | --- | --- | --- |
| **C1** | A4 + B2 | SEVERE | `grid grid-cols-12` cited as the card's existing layout. `grep -c grid` on `innovation-use-details.component.html` returns **0**; the pattern exists only in `policy-change.component.html` | **Fixed** — §6.1 rewritten to the card's real flat block flow |
| **C2** | A7 + B1 | SEVERE | NFR-IUL-001's *"the design MUST state whether the list is refreshed on section entry"* had no design counterpart, while §9 claimed a gate for it | **Fixed** — new §6.6 states the policy and its mechanism |
| **C3** | A6 + B10 | SEVERE | R-IUL-010 requires `LinkResultRolesEnum`, never a bare `5`. The enum member `INNOVATION_USE_LINKED_DEV` appeared **nowhere** in draft 1 | **Fixed** — §3.1, §5.1 and §10 now name it; migrations interpolate it |
| **C4** | A5 + B7 | WARNING | DTO key, response key and page-signal key never committed to — the exact contract points two executors on different hosts must agree on | **Fixed** — §4.1 is now a normative contract table |
| **C5** | A10 + B3 | WARNING | "disable when the options list is empty" had no specified data source, and the cited `policy-change` precedent is a hardcoded `[disabled]="true"`, not a live check | **Fixed** — §6.5 specifies the source and the loading carve-out |
| **C6** | A8 + B8 | WARNING | Cardinality edges unspecified: re-selecting a previously cleared target, and the concurrent-PATCH race | **Fixed** (upsert semantics) + **accepted risk** (race) — §3.2 |
| **C7** | A1 | **SEVERE** | `ResultInnovationUseService` injects no `ResultsService`; `ResultsModule` already imports `ResultInnovationUseModule` (`results.module.ts:31,77`), so the naive wiring is a module cycle. Draft 1 declared this risk "discharged" | **Fixed** — **verified by author.** §5.3 now specifies `forwardRef`, per the `link-results.service.ts` precedent |
| **C8** | A2 | WARNING | Draft 1 asserted `node_modules` was absent and TypeORM's empty-`IN` behavior unknowable. **False.** `typeorm@0.3.20` is installed; `QueryBuilder.js:738-741` renders empty `In` as `0=1`, so `Not(In([]))` is `NOT(0=1)` — always true | **Fixed** — **verified by author.** DD-2 **reversed**; OQ-6 **withdrawn** |
| **C9** | A3 | WARNING | Draft 1: the select's internal `body` "only re-syncs on `currentResultIsLoading()`". Inverted — the effect reads `this.signal()` inside its body (`select.component.ts:95,106`), so it is tracked and does re-run | **Fixed** — **verified by author.** §6.4's false premise and its fallback branch removed |
| **C10** | B4 | **SEVERE** | Migration B is `DROP FUNCTION` then `CREATE FUNCTION`. MySQL DDL implicitly commits, so a failure in the ~200-line `CREATE` leaves the function **absent**, not merely gating false — every call then errors outright | **Fixed** — §11.4 adds the failure mode and a recovery procedure |
| **C11** | B5 | WARNING | Migration A's `down()` is blocked by the `link_results` FK regardless of `is_active`; "after any role-5 rows are gone" silently means a **destructive hard delete** against the shared DB, given one clause and no procedure | **Fixed** — §11.2 flags it destructive and gives the guarded procedure |
| **C12** | A9 | WARNING | If the linked Dev result is later soft-deleted it drops out of the options list → the card vanishes, `isInvalid()` stays false (the value is still set), yet rule 16 goes FALSE. Exactly the DD-0 "red check, nothing on screen to fix" failure the design invokes elsewhere | **Fixed** — drove the DD-6 redesign: the card renders from the GET payload, not from the options list |
| **C13** | B9 | WARNING | NFR-IUL-002's third clause — new-tab behavior discoverable to assistive technology — had no design counterpart | **Fixed** — §6.3 |
| **C14** | B6 | — | **REJECTED as stated.** Judge B grepped the *component* and concluded the cited explicit-null precedent does not exist. The citation was to `get-innovation-use-details.interface.ts`, where `InnovationUseOrganization.institution_id` documents it verbatim. **But the underlying hazard is real and was accepted:** two opposing disciplines coexist in this one feature (`?? undefined` at `innovation-use-details.component.ts:489-492`, explicit-`null` in the interface), so an implementer can pattern-match the wrong one | **Rejected**, hazard **accepted** — §6.7 disambiguates and cites both |
| **C15** | A12 | INFO | `SelectComponent`'s amber is the hex literal `#E69F00`, not a `var(--ac-*)` token, so draft 1's "satisfied by configuration" overstated conformance to NFR-IUL-003 | **Softened** — recorded as pre-existing and inherited, not introduced |
| **C16** | A11 | INFO | Proposal scope items X-1/X-2 (family manifest, TRD/UX decisions-log sync) had no home in the design | **Fixed** — assigned to tasks in `tasks.md` |

---

## What the review actually bought

Two of these were unreachable by any automated gate in this repo, and both were mine:

- **C8** — a fabricated justification for the design's load-bearing decision. I read a Node ESM
  `exports` resolution error as "package not installed" and asserted an unknown I had never tested.
  That is K-014 ("check for an error in the raw output before you count it") and KZ-014 ("if the red
  has not been seen, it may not be asserted") in one move. **Net effect of the correction: the design
  got simpler** — reuse the shared helper instead of routing around it.
- **C7** — a risk the proposal recorded as R-7 and the design then declared "discharged" by an
  analogy (`ResultInnovationDevModule` "already does exactly this") that does not hold: that module
  reaches `ResultsService` only *transitively*, through `LinkResultsService`. A correction record
  asserted from a frame rather than from source — KZ-007.

**Kaizen signal for `/akili-archive`:** two author-side factual errors reached a committed design
document, both of the same shape — an unrun check reported as a settled fact. Neither was catchable
by `npm test`, `eslint`, or `tsc`. The blind dual-judge pass is what caught them.

---

## Round accounting

| | |
| --- | --- |
| Fix rounds used | **1** of 2 |
| Scoped re-judgment | **Not run.** Round-1 corrections are documentation-only against a design that has produced no code; the cheaper and stronger verification is the falsification table in draft 2 §9, which binds every corrected claim to an executable check at implementation time |
| Contradictions between judges | **0** — A and B overlapped on six findings and disagreed on none |
| Escalations to the user | **0** — no scope change, no destructive action, no budget breach |

**JUDGMENT: APPROVED ✅** — draft 2 supersedes draft 1; proceed to Phase 3.
