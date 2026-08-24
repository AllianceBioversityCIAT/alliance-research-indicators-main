# Judgment Day — Findings Ledger

> Blind dual review of `design.md`, run at `/akili-specify` Phase 2 **Review Design**. Persisted so `/akili-archive` Kaizen *Measure* can read it as evidence.

---

## Transaction

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bugfix/results-center-innovation-use-filter/` |
| Target (immutable for round 1) | `design.md` as of 2026-08-24, plus in-scope `requirements.md` and `proposal.md` |
| Mode | `judgment_day` — replaces ordinary 4R for this target |
| Round | **1 correction applied** (user authorized 2026-08-24). Scoped re-judgment is the next step |
| Judges | 2, blind, sequential (Judge A first attempt aborted; see runtime), read-only |
| Author model | **Cursor Grok 4.6** (this session) |
| Judge models | **Judge A: Composer 2.5** · **Judge B: Cursor Grok 4.5** — both ≠ author, both Cursor (no Claude; GPT 5.6 Other-Models quota exhausted) |
| Refuter | **not launched** |
| Judge A verdict | 2 severe · 5 warning · 2 suggestion |
| Judge B verdict | 2 severe · 4 warning · 2 suggestion |
| Live source in scope | **Yes** — orchestrator re-derived load-bearing claims from `results-center.service.ts`, `results-center.service.spec.ts`, chip template/SCSS, `indicators.service.ts`, server `IndicatorsEnum` / `findAll` |
| Status | **`JUDGMENT: APPROVED`** |

### Runtime incident (how this round was staffed)

Judge A was first launched on `gpt-5.6-sol-medium` and **did not deliver**: Other Models usage limit; the harness fell back to grok-4.6 (same family as the author). That run was **discarded as a runtime failure**, not read as a zero-findings verdict. Judge A was relaunched on **Composer 2.5**. Judge B completed on **Grok 4.5**. No Claude models were used.

### Criteria given to both judges (identical)

1. Contrast every count, total, quantity, and figure against the other in-scope documents **and** source.
2. Requirement coverage: every `R-RCF-###` / `NFR-RCF-###`, including each `BUT` / `AND IT MUST`. A gap may not be discharged by citing a different requirement.
3. Internal consistency across the design's own sections.
4. Constitutional conformance (STAR client bugfix).
5. Kaizen: KZ-001, KZ-014, KZ-005/KZ-007, KZ-017, K-020.
6. Unfalsifiable or self-confirming checks.
7. Claims of verification the target did not earn.
8. Bug Mode: can the regression test go red on **current** code?

---

## What survived falsification

Attacked by both judges and independently re-derived by the orchestrator:

| Claim | Outcome |
| --- | --- |
| Defect allowlist `[0, 1, 2, 3, 4, 5]` in `ResultsCenterService.onChangeList` omits 6 | **Held** |
| `IndicatorsEnum.INNOVATION_USE = 6`; `IndicatorsService.findAll()` filters only `is_active` | **Held** — server is not the defect |
| Create-result `targetIndicatorIds = [1, 2, 4, 5, 6]` already admits 6 | **Held** — DD-1 must not copy that membership (omits 3) |
| Chip UI: `[class.able]="filter.able"` + SCSS default `pointer-events: none` / `.able { pointer-events: auto }` | **Held** |
| `onSelectFilterTab` has no allowlist of its own; writes `'indicator-codes-tabs': [id]` for any id | **Held** |
| Named effect spec fixture is `{1, 2, 7}` with index asserts and `length === 4` — cannot go red for omit-6 until the fixture includes 6 | **Held** |
| Adding id 6 to the fixture + `expect(find id 6).able === true` **fails on current code** | **Held** — Bug Mode is reachable if the assertion is written that way |
| DD-1 (add 6, keep the list) is the right smallest fix | **Held** |

---

## Findings — merged

Disposition follows the skill's Decision Gates. Where judges split on severity, the **higher** rating is taken when the underlying fact matches.

### Confirmed by both judges → eligible for round-one correction

| ID | Substance | Judge A | Judge B | Orchestrator |
| --- | --- | --- | --- | --- |
| **C-1** | **§7 says "extend" the existing `onChangeList effect` example, which still asserts by array index and `length === 4`.** DD-3 forbids index asserts; DD-4 expands the fixture to ids 1–6 and 7 (plus prepended 0). After that expansion, `listSignal()[3]` is id 3 (`able === true`), not sentinel 7. The test would go red for the **wrong** reason, or the sentinel would stay green for the wrong row (**KZ-001**). §3 composition table also says "Extend". | F-1 **SEVERE** | F-3 WARNING (`length === 4` vs DD-4) | Confirmed in `results-center.service.spec.ts` first `describe('onChangeList effect')`: fixture `{1,2,7}`, `expect(length).toBe(4)`, `[1].able` / `[2].able` / `[3].able` |
| **C-2** | **NFR-RCF-002 / §7 grep gate has no committed pattern.** "Grep the defect *shape*" is not a regex, not a command, not a per-file output template. Two executors can count different hits; zeros cannot be audited (**KZ-005 / KZ-007 / KZ-017**). | F-2 **SEVERE** | F-4 WARNING | Confirmed: §7 row is prose only. Proposal §9 snapshot is not an executable gate |
| **C-3** | **R-RCF-001 AC.2 has no executable gate.** AC.2 requires selecting the chip → active tab 6 and `'indicator-codes-tabs': [6]`. DD-5 discharges it by citing AC.1 (`able === true` makes the path "reachable"). A gap may not be discharged by citing a different AC. Existing `onSelectFilterTab` specs cover ids `0` and `1`; none call `onSelectFilterTab(6)`. D6 accepts **CSS clickability**, not AC.2. Requirements §4 also lists `onSelectFilterTab` as out of scope while AC.2 still requires the select. | F-3 WARNING | F-2 **SEVERE** | Confirmed: `describe('onSelectFilterTab')` has no id 6; one case only `toBeDefined()` |

**Recommended remediations (round 1, if authorized):**

- **C-1** — In §7 (and §3), say **replace** (not extend) the named `it(...)` index asserts with `list.find(i => i.indicator_id === n)?.able` for ids 0–7. Delete `listSignal()[n].able` and `length === 4` from that example. Name the `it` string so the second duplicate `describe('onChangeList effect')` is not the edit target.
- **C-2** — Commit the grep: pre-fix `rg -n '\[0,\s*1,\s*2,\s*3,\s*4,\s*5\]' client/ server/` (or equivalent); post-fix that pattern gone from `client/`; re-grep new membership; per-file zeros; DD-6 exemption quoted for `indicators.service.ts` `targetIndicatorIds`.
- **C-3** — Add one §7 line: `onSelectFilterTab(6)` → `resultsFilter()['indicator-codes-tabs'] === [6]` (and active tab 6). Cheap, id-anchored. Alternative: rewrite AC.2 as accepted risk with a D-id — **not recommended**; the gate is one assertion.

### Suspect — one judge only. **Not auto-fixed**

| ID | Substance | Filed by | Note |
| --- | --- | --- | --- |
| **S-1** | Proposal §13 can be read as "write `expect(able === false)` then flip to `true` after the fix". Design §7 / NFR-RCF-001 keep a permanent `expect(true)` that fails on current code. Following the proposal literally is Bug Mode theatre (**KZ-014**). | Judge B F-1 **SEVERE** | Judge A did **not** file this; A treated the design's permanent-`true` as correct and said Bug Mode is reachable. Orchestrator agrees with A on the **design** and with B that **proposal §13 is ambiguous**. Clarifying one sentence in §7 ("the expect is always `true`; red = that expect fails today; do not rewrite the expect") is a one-line lock, not a design invert |
| **S-2** | Two `describe('onChangeList effect')` blocks in the same spec file (first: ids 1,2,7 + indices; second: id 99 + `find`). Risk of editing the wrong block. | Judge A F-4 WARNING | Fold into C-1 remediation (name the `it` string). Not a separate design invert |
| **S-3** | Proposal §5 "one production line, one spec file" vs design §3 four paths (service, spec, `family.md`, `OPEN-ITEMS.md`). | Judge A F-5 WARNING | Count drift across docs; docs rows are already in §10 LOC. Not a behavioral defect |
| **S-4** | §9 claims a cross-check of every BUT / AND IT MUST but omits R-RCF-002 AC.1 and the NFR rows, and includes "effect destroys itself" which is not a requirements clause. | Judge A F-7 WARNING | Documentation completeness, not a missing gate if C-1/C-3 land |
| **S-5** | Create-result exemption mixed with re-grep of the old literal — executor might skip re-grepping the **new** membership. | Judge B F-6 WARNING | Fold into C-2's committed command |
| **S-6** | Existing `onSelectFilterTab` `toBeDefined()` does not prove active tab / filter write. | Judge B F-5 WARNING | Subsumed by C-3 if the new assertion is added |

### Info — recorded, not fixed in this lineage

| ID | Substance | Filed by |
| --- | --- | --- |
| **I-1** | §7 cites K-020 `--coverage=false` but not the targeted file command. Implementer can hit coverage floors with a green spec. | A F-8 SUGGESTION |
| **I-2** | §10 "Tasks: 1" does not split docs rows vs code. Fine for Lite if `task.md` has an internal checklist. | A F-9 SUGGESTION |
| **I-3** | Phantom child-guide citation (Judge B F-7). | B F-7 SUGGESTION |
| **I-4** | Literal `0` in the allowlist is a no-op because All Indicators is prepended with `able: true`. Harmless; do not "clean" it in this bugfix (would look like a behavior change). | B F-8 SUGGESTION |
| **I-5** | **Discarded:** Judge A F-6 (folder has no `task.md`). Expected — Review Design is **before** Phase 3. Not a design defect. | A F-6 WARNING |

---

## Counts (round 1 merge)

| Bucket | Count |
| --- | --- |
| Confirmed severe (eligible to fix) | **3** (C-1, C-2, C-3) |
| Suspect | **6** |
| Info / discarded | **5** |
| Contradictions requiring a human product call | **none** on the fix itself (DD-1 held) |

---

## Round-1 correction (user authorized 2026-08-24)

Applied only to confirmed severe **C-1, C-2, C-3**. Files: `design.md`, `requirements.md` §4 in-scope/out-of-scope (AC.2 vs method body). `proposal.md` untouched (S-1 remains suspect).

| ID | What changed |
| --- | --- |
| **C-1** | §3 composition says **Replace** not extend. §7 names the first `it('should prepend All Indicators and set able by indicator_id when isLoading is false')`, forbids `listSignal()[n].able` and `length === 4`, asserts by `find` on ids 0–7. Expect on id 6 is always `toBe(true)` (S-1 lock folded into this row). |
| **C-2** | §7 commits pre-fix `rg -n '\[0,\s*1,\s*2,\s*3,\s*4,\s*5\]' client server --glob '!**/archive/**'`; post-fix that pattern gone from `client/`; re-grep `[0, 1, 2, 3, 4, 5, 6]`; DD-6 exemption quoted; KZ-017 cannot-reach named. |
| **C-3** | **DD-5 inverted:** one `onSelectFilterTab(6)` case (seed row 6, spy `main`, filter `[6]`, `active === true`). Requirements §4: method body out of scope; unit call in scope. |

Folded because the C-remediations named them: S-2 (named `it`), S-5 (re-grep new membership), I-1 (targeted `npx jest … --coverage=false`). §9 expanded so AC.2/NFR rows have an owner (S-4 adjacent).

---

## Scoped re-judgment 1 (after round-1 correction)

| Field | Value |
| --- | --- |
| Judge A | Composer 2.5 — C-1/C-2/C-3 **CLOSED**; **1 new SEVERE** (N-1) |
| Judge B | Grok 4.5 — C-1/C-2/C-3 **CLOSED**; **1 new WARNING** (N-1, same fact) |
| Orchestrator | Confirmed in Node: `new RegExp('onChangeList effect\\\\|onSelectFilterTab')` matches none of the describe/it names; unescaped `\|` matches both describe names |

### N-1 (fix-caused, severity split → treated as confirmed fact)

`--testNamePattern='onChangeList effect\|onSelectFilterTab'` in a **shell** single-quoted string gives Jest a regex that matches a literal `|`, so the targeted gate runs **zero** tests and exits 0 (vacuous green). Introduced by folding I-1 into a markdown **table** cell, where `\|` is required by CommonMark.

**Round-2 correction (final bounded fix, parent-launched per “scoped re-judgment fails before round two”):** command moved out of the table into a fenced bash block with unescaped `|`, plus an explicit “do not backslash” note.

---

## Terminal receipt

| Field | Value |
| --- | --- |
| Target | `docs/specs/bugfix/results-center-innovation-use-filter/design.md` |
| Skill | `judgment-day` v1.7 — Review Design, `/akili-specify` Phase 2 |
| Author | Cursor Grok 4.6 |
| Judges | A Composer 2.5 · B Grok 4.5 (no Claude) |
| Round-1 confirmed severe | 3 (C-1, C-2, C-3) — **closed** after user-authorized correction |
| Suspect / info left as-is | S-1…S-6 (except folds named in C-remediations) · I-1…I-5 |
| Fix rounds used | **2 of 2** (C-1/C-2/C-3; then N-1) |
| Scoped re-judgments used | **2 of 2** |
| Re-judgment 1 | C-1/C-2/C-3 CLOSED; N-1 opened (severity split SEVERE/WARNING; fact corroborated) |
| Re-judgment 2 | N-1 **CLOSED**; **0** new severe (both judges) |
| Contradictions | none on DD-1 |
| Artifact | this file |

**JUDGMENT: APPROVED ✅**

Design may proceed to `/akili-specify` Phase 3 (`tasks.md`). One Lite task. Gates in `design.md` §7 are the source of truth for red-before/green-after.
