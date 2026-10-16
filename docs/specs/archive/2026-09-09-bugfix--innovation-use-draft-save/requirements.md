# Requirements — Innovation Use drafts must save while incomplete

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/innovation-use-draft-save` |
| **Depth** | **Lite** · **Bug Mode** (regression test mandatory) |
| **Type** | Bug |
| **Approval Mode** | `gated` |
| **Proposal** | [`./proposal.md`](./proposal.md) — approved 2026-08-21, **option A** confirmed by the user |
| **Root cause** | Confirmed on both tiers; see `proposal.md` §9 |
| **`OQ-1`** | **Resolved** from the repo (`proposal.md` §15) — no open questions block this spec |
| **Date** | 2026-08-21 |
| **Leader deviation, recorded** | The three specify phase gates were **combined into one presentation**. The spec is Lite, the diagnosis is verified line-by-line, and the user's stated goal is a test deployment. Recorded rather than taken silently |

---

## 2. Executive Summary

Clicking **Save** on the Innovation Use details section currently does nothing when the resolved use level is `>= 6` and **Justification** is blank — no request, no feedback. The rule is enforced on both tiers at save time; it belongs at submit time, where the green check already enforces it and where every other STAR section already puts it.

**This spec makes the draft save.** It does not relax what completing the section requires.

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **Resolved level** | `clarisa_innovation_use_levels.level`, reached by joining on `innovation_use_level_id`. **`id = level + 1`** — id 7 is level 6 |
| **Green check** | The per-section completeness boolean. For this section it is the SQL function `innovation_use_validation` |
| **`valid_text`** | SQL helper: `LENGTH(TRIM(REGEXP_REPLACE(text,'\s+',''))) > 0`. `NULL`, `''` and whitespace-only all return `FALSE` |
| **Save** vs **Submit** | Save = `PATCH` of section data, allowed on an incomplete draft. Submit = the status transition, gated on completeness |

---

## 4. System Context & Scope

### In scope

| Tier | Change |
| --- | --- |
| Server | Delete `validateLevelExplanation` and its single call site in `ResultInnovationUseService` |
| Client | Drop `!justificationMissing()` from the save gate in `innovation-use-details.component.ts`; render the required message exactly once |
| Tests | Invert the unit tests that assert rejection; redesign the boundary fixture; add the Bug-Mode regression fixture |
| Docs | Pivot the `details-page` spec; write a superseding record for archived chunk 2; add a `family.md` follow-up row |

### Out of scope

| Excluded | Why |
| --- | --- |
| The submit gate | Completeness stays required to submit. **Verified working by the reporter**: the Submit button activates only when all green checks are green, and the transition succeeds |
| `completenessValidation`'s `enabled: false` on `DRAFT → SUBMITTED` | Platform-wide for every indicator (`proposal.md` §15). A product/security decision far larger than this bugfix. **Filed, not actioned** |
| `hasDuplicateActorType()`'s save block | Invalid *data*, not an unfinished draft. Legitimate mirroring of a server rule (PRD `AC-Role-Correctness`) |
| The shared `TextareaComponent` | T-09 ruled it out on blast-radius grounds; that ruling stands |
| `innovation_use_validation` | Already correct. **No migration in this spec** |
| Adding a trim to `buildPayload` | Would introduce a bug — see **R-IUD-001** AC.5 |
| Dark mode | `details-page` **DD-14** |

---

## 5. Stakeholders / Personas

| Persona | Interest |
| --- | --- |
| **Result Contributor** | Reports an Innovation Use result at use level 6–9 and needs to save partial work across sessions. Today they cannot save at all |
| **MEL reviewer** | Unaffected — completeness gating at submit is unchanged |
| **Platform owner** | Inherits the filed finding about first-submit validation |

---

## 6. Functional Requirements

### R-IUD-001 — A draft saves regardless of justification completeness

- **As a** Result Contributor
- **I want** Save to persist my work even when the justification is not written yet
- **So that** I do not lose everything else I filled in

**Details**

- The client SHALL issue the `PATCH` whenever the status is editable, the load did not fail, no request is in flight, and no duplicate actor type exists — **and SHALL NOT consider the justification when deciding whether to send.**
- The server SHALL NOT reject a save because the justification is blank at resolved `level >= 6`.

**Acceptance criteria**

- [ ] AC.1 — At resolved `level >= 6` with a blank justification, Save issues exactly one `PATCH` and shows the success toast.
- [ ] AC.2 — The saved values survive a re-read of the section.
- [ ] AC.3 — The server returns `2xx`. No `400` mentioning `innovation_use_level_explanation` is possible, on any input.
- [ ] AC.4 — At resolved `level < 6` behavior is unchanged.
- [ ] AC.5 — **`buildPayload` is byte-identical.** A never-typed justification omits the key; a typed-then-deleted one sends `''`; whitespace is sent verbatim.

#### Scenario: Saving a level-7 draft with no justification

- GIVEN an editable Innovation Use result at resolved level 7 with an empty justification and one complete actor row
- WHEN the contributor clicks **Save**
- THEN one `PATCH` is issued, the server answers `2xx`, and the success toast appears
- AND a re-read returns the actor row and the level
- BUT it must NOT clear or overwrite a previously stored justification when the field was never typed into
- AND IT MUST leave the section's green check `false`, so the sidebar tick stays gray.

#### Scenario: Whitespace-only justification is stored but counts as absent

- GIVEN the same result with `'   '` typed into the justification
- WHEN the contributor clicks **Save**
- THEN the save succeeds and the whitespace is stored verbatim
- AND the green check returns `false`, because `valid_text` strips all whitespace before measuring
- BUT it must NOT be normalized to `undefined` in `buildPayload` — that would send no key, and the server's *key-present ? payload : stored* rule would preserve the old value, so **a deletion would silently fail to persist**
- AND IT MUST keep the Submit button disabled.

---

### R-IUD-002 — Completeness stays required to submit

- **As a** MEL reviewer
- **I want** an incomplete Innovation Use section to remain unsubmittable
- **So that** removing the save-time block does not let incomplete records through

**Details**

- `innovation_use_validation` is unchanged. Its `IF(useLevel >= 6, explanationValid, TRUE)` conjunct continues to gate the section's green check, and the client continues to gate the Submit button on all green checks.

**Acceptance criteria**

- [ ] AC.1 — With a blank or whitespace-only justification at resolved `level >= 6`, the section's green check is `false`.
- [ ] AC.2 — Filling the justification with real text flips it to `true`.
- [ ] AC.3 — On the `REVISED → SUBMITTED` transition the server still rejects an incomplete result (`completenessValidation` is `enabled: true` on row id 30).
- [ ] AC.4 — No migration is added; `innovation_use_validation` is byte-identical.

#### Scenario: The tick does not turn green just because the save worked

- GIVEN a level-7 draft saved with a blank justification
- WHEN the sidebar refreshes its green checks
- THEN the Innovation use details tick is gray and the Submit button is disabled
- BUT it must NOT report the section complete on account of a successful save
- AND IT MUST turn green as soon as real text is saved into the justification.

---

### R-IUD-003 — The required message renders exactly once

- **As a** Result Contributor
- **I want** one clear message telling me the justification is needed
- **So that** I am not shown the same error twice in two colors

**Details**

- Two messages render today for a pure-blank justification: the shared `app-textarea`'s own, and a page-owned block T-09 added because the shared component does not trim.
- **The two messages must be made DISJOINT, not one of them suppressed.** `app-textarea`'s own `isInvalid()` is untrimmed, so it owns the **raw-empty** cases (`undefined`, `null`, `''`) and is silent on whitespace. The page-owned block owns exactly the gap that leaves: **whitespace-only**, where the raw value is non-empty but trims to nothing. Gate it on that disjoint subset rather than on `justificationMissing()` directly, and the two are mutually exclusive by construction — never both, never neither. `app-textarea`'s bindings stay untouched.

> ⛔ **Corrected 2026-08-21 after T-02 attempt 1.** This bullet originally read: *"The **page-owned block is the one to keep** — it uses `.trim()`, so it covers blank and whitespace. The shared component's message must be suppressed for this field only, without editing the shared component."* **That prescription is falsified by this spec's own gates.** Suppressing the shared message unconditionally makes deleting the page-owned block kill the blank *and* whitespace cases together — but `tasks.md` T-02's mandatory falsifying input requires **only** the whitespace case to fail while the blank case still passes, and §8 **D5** says the same. Two binding gates contradicted the prose. The bullet was **over-specified from the start**: `design.md` §3.3 had already delegated the mechanism to the Implementer, and this Details bullet should never have prescribed one.
>
> **Do not "fix" this back toward suppression.** It reads like the simpler design and it breaks the falsifier. Recorded here so the next reader does not re-derive the mistake. *(Found by the T-02 Reviewer's 4R risk lens, not by the conformance gate — all six ACs held, which is exactly why the drift would otherwise have survived the run.)*

**Acceptance criteria**

- [ ] AC.1 — Blank justification at resolved `level >= 6` renders exactly **one** node with the required text.
- [ ] AC.2 — Whitespace-only renders exactly **one**.
- [ ] AC.3 — Real text renders **zero**.
- [ ] AC.4 — At resolved `level < 6` the textarea and message are absent.
- [ ] AC.5 — The red asterisk still renders at `level >= 6`.
- [ ] AC.6 — **`TextareaComponent` is byte-identical** (`git diff --exit-code` on its path).

#### Scenario: One message, not two

- GIVEN a level-7 draft with an empty justification
- WHEN the section renders
- THEN exactly one required message is present, with the asterisk
- BUT it must NOT render a second message in a different color
- AND IT MUST still appear for a whitespace-only value, which is the case the page-owned block exists to catch.

---

## 7. Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| **NFR-IUD-001** | No new dependency, no migration, no change to any shared component |
| **NFR-IUD-002** | Server coverage stays above the 60% floor; client coverage above 40/20/45/30 |
| **NFR-IUD-003** | Both tiers ship in one PR. A half deploy turns a silent no-op into a visible `400` |

---

## 8. Defect classes this spec can produce, and the gate for each

| Class | Gate | Can it fail? |
| --- | --- | --- |
| **D1 — The save still does not fire** | Client component spec asserting one `PATCH` on `HttpTestingController` | Yes: restore the gate condition → FAIL |
| **D2 — The server still rejects** | Bug-Mode regression fixture against real MySQL | Yes: restore `validateLevelExplanation` → FAIL |
| **D3 — Completeness silently lost** | Fixture asserting the green check is `false` after the blank save, **and** that `REVISED → SUBMITTED` still rejects | Yes: stub the green check to `true` → FAIL |
| **D4 — Inverted tests became tautologies (KZ-001)** | Every inverted test asserts the **positive** outcome (a request is issued, values persist) **and** that the message renders — never merely the absence of a throw | Yes: replace an assertion with `expect(() => …).not.toThrow()` → the review must FAIL it |
| **D5 — Duplicate message survives, or both vanish** | Count the rendered nodes: 1 / 1 / 0 across blank / whitespace / filled | Yes: remove the page-owned block → whitespace case FAIL |
| **D6 — Shared component edited** | `git diff --exit-code` on `TextareaComponent` | Yes: touch one byte → FAIL |
| **D7 — Stale claims left in the amended specs** | Correction Closure sweep, both directions (**KZ-005**) | Yes: grep the superseded phrasing → any surviving hit is a FAIL |

**No class is unsubstituted.** This spec produces no visual or layout output, so the `details-page` human-gate substitutes (D7/D8 there) do not apply — the one rendered assertion, the message count, is a **node count** that jsdom evaluates correctly.

> **Disqualifier that binds every task:** a suite run that is filtered, targeted, or skipped is **inconclusive**, never a pass (**KZ-003**). Both packages run their full suites unfiltered.

---

## 9. Requirement ID Index

| ID | Behavior | Scenarios | ACs |
| --- | --- | --- | --- |
| R-IUD-001 | A draft saves regardless of justification completeness | 2 | 5 |
| R-IUD-002 | Completeness stays required to submit | 1 | 4 |
| R-IUD-003 | The required message renders exactly once | 1 | 6 |
| NFR-IUD-001…003 | No new deps/migration/shared edits; coverage floors; single PR | — | — |
