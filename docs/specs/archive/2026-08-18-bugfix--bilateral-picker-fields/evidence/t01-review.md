# T-01 Reviewer Audit — bilateral-picker-fields
Reviewer: T3 Auditor (Antigravity/pro) · Diff: t01.diff · Date: 2026-08-18

---
## Axis 1 — Clause Coverage (13 clauses owned by T-01)

### R-BPF-001 (4 clauses)

**THEN both fields present** — diff line 318-319: `full_name: p.full_name` and `description: p.description` added to the return projection. ✅ SATISFIED

**AND description empty-value when upstream absent** — spec AC.2 requires field not render as string `"undefined"`. The projection uses `p.description` directly (diff line 319); when upstream omits the field, `p.description` is `undefined` (not the string). Test fixture at diff line 74 asserts `description: undefined`. ✅ SATISFIED

**BUT NOT rename/retype/remove** — the existing fields `id`, `short_name`, `source_of_funding`, `phase`, `source_center_acronym`, `has_science_programs`, `science_programs` are all in the return object, unchanged. The strict `toEqual` test at diff lines 44–53 (GREEN run) confirms no removal or rename. ✅ SATISFIED

**AND IT MUST leave the other five fields byte-identical in shape** — spec §3 R-BPF-001 names `science_programs`, `has_science_programs`, `phase`, `source_center_acronym` (plus `source_of_funding` implied in the five existing). The diff does not touch the `science_programs` sub-projection (diff lines 311–313 unchanged). ✅ SATISFIED

### R-BPF-002 (5 clauses)

**THEN name term matches** — diff lines 284–288: predicate now ORs `p.full_name?.toLowerCase().includes(needle)`. Test "matches by full_name … musasentinel" was RED before fix, GREEN after. ✅ SATISFIED

**AND code term still matches** — diff line 283: `p.short_name?.toLowerCase().includes(needle)` retained. Test "still matches by short_name code term" was PASSING in RED (pre-existing behaviour unchanged). ✅ SATISFIED

**AND case-insensitive** — `needle = search?.trim().toLowerCase()` (diff line 281, unchanged from before); same pattern applied to `full_name` via `.toLowerCase()`. Test "matches uppercase full_name term" was RED, now GREEN. ✅ SATISFIED

**BUT NOT match on description** — `description` is NOT in the filter predicate (diff lines 284–288). Test "does NOT match on description" searched `secret_target` (a term only in `description`) and asserted empty result. This test PASSED in RED (line 14 of RED file) — see Axis 4 for implications. ✅ SATISFIED (but the description-non-match test is a pre-existing pass — noted in Axis 4)

**AND IT MUST tolerate absent full_name without throwing** — optional chaining `p.full_name?.toLowerCase()` (diff line 287) means undefined → undefined; `undefined.includes(...)` is never called. Test "tolerates absent full_name… matches short_name" was PASSING in RED (existing behavior on short_name; new field path does not throw). ✅ SATISFIED

### R-BPF-006 (4 clauses)

**THEN ordered case-insensitively by full_name** — diff lines 291–301: `[...filtered].sort(...)` with `(a.full_name || a.short_name || '').toLowerCase()` as key, using `localeCompare`. ✅ SATISFIED

**AND absent-name items sort by short_name IN THE SAME SEQUENCE, not clustered** — The key expression `(a.full_name || a.short_name || '').toLowerCase()` means an item without full_name uses its short_name as the sort key, placing it wherever that string falls alphabetically relative to other names. `B-A1080` (no full_name) sorts as `b-a1080`, which precedes `fertilize right colombia` and `wto-phase 1…`. Test fixture confirms this: expected order [2, 3, 1] = [B-A1080, Fertilize Right Colombia, WTO-Phase 1…]. RED evidence line 17 shows this test failed (order was [1,2,3]); GREEN confirms [2,3,1]. ✅ SATISFIED

**BUT NOT change which options are returned** — sort operates on `[...filtered]` (a spread-copy); count and membership unchanged. The determinism test asserts `toHaveLength(3)` on both calls. ✅ SATISFIED

**AND IT MUST be stable across two calls** — the determinism test (diff lines 244–255) calls `listBilateral()` twice with identical mock data and asserts both orders are equal. This test PASSED in RED (line 18 of RED), so it does not prove the fix for ordering — it only verifies that whatever order the controller produces is reproducible. Minor concern: it PASSED before the sort was added, meaning identical-order-across-two-calls was already trivially true for an unsorted list. This is noted in Axis 4. ✅ SATISFIED (functionally adequate post-fix, though its RED evidence value is zero — see Axis 4)

---
## Axis 2 — Additivity (NFR-BPF-001)

Spec: "zero fields renamed, retyped, or removed from the picker response" (requirements.md NFR-BPF-001).

**Fields before (from design.md §5 table):**
`id`, `short_name`, `source_of_funding`, `phase`, `source_center_acronym`, `has_science_programs`, `science_programs`

**Fields after (diff lines 315–323):**
`id`, `short_name`, **`full_name`** (new), **`description`** (new), `source_of_funding`, `phase`, `source_center_acronym`, `has_science_programs`, `science_programs`

No existing field renamed, retyped, or removed. The diff does not remove any key from the return object and does not change the shape of `science_programs`. The strict `toEqual` test on the whole item enforces this at the gate level.

✅ PASS — NFR-BPF-001 satisfied; two fields added, none removed.

---
## Axis 3 — No New Upstream Call (NFR-BPF-003)

Spec: "No new upstream call. The fields already arrive in the fetched payload." (requirements.md NFR-BPF-003). Disqualifier: adding an HTTP call fails this NFR regardless of response size.

The diff modifies only two files: `clarisa-projects.controller.ts` and its spec. The controller diff (diff lines 258–323) shows:
- No new service method called
- No new import added
- `this.projectsService.listBilateralProjects(...)` call is unchanged (diff line ~280 not touched)
- The new fields (`p.full_name`, `p.description`) read directly from the already-fetched `ClarisaProject` object

Confirmed by requirements.md §5: "Both fields are already in the fetched payload (`dto/clarisa-project.types.ts:66,68`)."

The Swagger `@ApiQuery` description for `search` (diff line 275) is updated from `short_name` only to `short_name or full_name` — this is a documentation fix, not a call.

✅ PASS — NFR-BPF-003 satisfied; no new upstream call introduced.

---
## Axis 4 — Evidence Integrity (RED/GREEN cross-check)

**14 tests total. RED file: 5 failed, 9 passed. GREEN file: 14 passed.**

### Identifying NEW vs pre-existing tests

The diff adds the following new test cases (those whose names do not appear in the previous T-04/T-15.15 describe header):

**NEW tests (added by this diff):**
1. "returns trimmed picker shape with additive fields including full_name and description (R-BPF-001, NFR-BPF-001)" — renamed/augmented from the old shape test
2. "handles absent full_name and description without throwing (R-BPF-001)" — renamed from the old "returns empty science_programs array…" test
3. "supports full_name of exactly 255 characters (KZ-001 / R-BPF-005)" — fully new
4. `describe('search filtering')` block → 5 sub-tests (replacing the single old search test):
   - "matches by full_name case-insensitively when short_name does not contain needle"
   - "matches uppercase full_name term case-insensitively"
   - "still matches by short_name code term"
   - "does NOT match on description (DD-2 / OQ-1)"
   - "tolerates absent full_name without throwing and matches short_name"
5. `describe('sorting')` block → 2 sub-tests:
   - "orders case-insensitively by full_name…"
   - "produces stable and deterministic order across two identical invocations"

**Pre-existing tests (confirmed by their passing in RED):**
The 9 passing tests in RED are:
- "listBilateral is gated by CENTER_ADMIN + SYSTEM_ADMIN roles" ✓ (old)
- "handles absent full_name…" ✓ (this is the renamed absent test — it PASSES in RED because it only asserts the call doesn't throw, not the shape)
- "forwards phase parameter…" ✓ (old T-04)
- "lets non-numeric phase throw BadRequestException" ✓ (old T-04)
- "forwards onlyWithSciencePrograms…" ✓ (old T-04)
- "still matches by short_name code term" ✓ (old behavior, short_name filter still works)
- "does NOT match on description" ✓ (old behavior — description was never in the predicate, so this always passed)
- "tolerates absent full_name without throwing…" ✓ (passes because short_name matching doesn't throw on absent full_name)
- "produces stable and deterministic order across two identical invocations" ✓

**The 5 RED failures (tests that prove the fix):**
1. "returns trimmed picker shape with additive fields including full_name and description" — RED because full_name/description absent from HEAD projection. ✅ Legitimate gate.
2. "supports full_name of exactly 255 characters" — RED because full_name absent from projection. ✅ Legitimate gate.
3. "matches by full_name case-insensitively when short_name does not contain needle" — RED because HEAD filter is short_name-only. ✅ Mandatory red gate confirmed.
4. "matches uppercase full_name term case-insensitively" — RED for same reason. ✅ Legitimate gate.
5. "orders case-insensitively by full_name… in sequence" — RED because HEAD returns unsorted. ✅ Legitimate gate.

### Problems found:

**ISSUE-E1 — Two new tests PASSED in RED and are not regression evidence:**
- "does NOT match on description" — PASSED in RED (line 14). It was never possible for description to match because description was not in the predicate. This test proves the old behavior that was already correct, not the new behavior. It **cannot** be offered as evidence that the fix correctly excludes description. However, it correctly exercises the post-fix state and its GREEN result is trivially true. Recorded as a non-gating observation.
- "tolerates absent full_name without throwing…" — PASSED in RED (line 15). Because the old predicate was `p.short_name?.toLowerCase().includes(needle)` — it only accessed short_name, so absent full_name never threw. This test does not prove that the new `p.full_name?.toLowerCase().includes(needle)` path is safe; it proves the old path was safe. The fix's safety comes from optional chaining in the new code, not from this test going red. The test passes for both old and new code, making it **not regression evidence** for the R-BPF-002 "tolerate absent full_name" clause.
- "produces stable and deterministic order across two identical invocations" — PASSED in RED (line 18). An unsorted list is trivially stable across two calls. This does not prove the sort is deterministic; it proves that before sorting, two identical calls return identical (arrival) order. Post-fix this test is still valid but carries no RED-gate value.

**Verdict on the 9 passers in RED:** These are NOT the pre-existing T-04 tests wholesale — 3 of the 9 are NEW tests that happened to pass on HEAD (see above). The 5 pre-existing T-04 tests (role gate, phase forwarding, BadRequestException, onlyWithSciencePrograms, old search) can be identified as such.

✅ The 5 RED failures are all genuine, correctly chosen regression gates.
⚠️ ADVISORY: 3 new tests passed in RED (description-non-match, absent-full_name-no-throw, determinism). They do not constitute regression evidence but do not affect correctness of the fix.

---
## Axis 5 — Fixture Fidelity (KZ-001 / DD-7)

Spec requires: spellings `A1806`, `B-A1080`, `C-A480`; a `full_name` of exactly 255 characters. Invented fixtures like `PROJ-1` are a FAIL.

### short_name spellings:
- `A1806` — diff line 36: `short_name: 'A1806'` ✅
- `B-A1080` — diff line 63: `short_name: 'B-A1080'` ✅
- `C-A480` — diff line 89: `short_name: 'C-A480'` ✅

All three measured spellings appear across the fixture sets. No invented `PROJ-1`, `T-PJ-*` or similar patterns remain in the new test blocks (the old `T-PJ-003262-CIAT` and `T-PJ-001122-BIOVERSITY` were removed by the diff and replaced with the real spellings).

### 255-character full_name:
Diff line 83: `const fullName255 = 'WTO-Phase 1: MusaSentinel - ' + 'X'.repeat(255 - 28);`
Then line 84: `expect(fullName255.length).toBe(255);`

The prefix `'WTO-Phase 1: MusaSentinel - '` must be exactly 28 characters. Counting: `W-T-O---P-h-a-s-e- -1-:- -M-u-s-a-S-e-n-t-i-n-e-l- -- -` = 28 characters. ✅ Verified by character count: "WTO-Phase 1: MusaSentinel - " = W(1)T(2)O(3)-(4)P(5)h(6)a(7)s(8)e(9) (10)1(11):(12) (13)M(14)u(15)s(16)a(17)S(18)e(19)n(20)t(21)i(22)n(23)e(24)l(25) (26)-(27) (28). ✅

28 + (255-28) = 255. The inline assertion `expect(fullName255.length).toBe(255)` is self-verifying in the test runtime. The expression is provable from source text — not a hand-typed literal.

✅ PASS — All fixture spellings match evidence/; 255-char length is provable from expression.

---
## Axis 6 — Scope

Spec tasks.md T-01: exactly 2 files intended:
- `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.controller.ts`
- `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.controller.spec.ts`

Diff headers (lines 1 and 259):
- `diff --git a/server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.controller.spec.ts`
- `diff --git a/server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.controller.ts`

Exactly 2 files modified. No third file touched.

✅ PASS — Scope is exactly as specified.

---
## Axis 7 — Determinism

Spec: "identical order across two identical calls. Check tie handling and null/undefined in the comparator, and confirm it sorts a COPY ([...filtered]) without mutating the source."

### Sorts a copy:
Diff line 291: `const sorted = [...filtered].sort(...)` — spread operator creates a new array. `filtered` is not mutated. ✅

### Comparator inspection (diff lines 292–300):
```
const keyA = (a.full_name || a.short_name || '').toLowerCase();
const keyB = (b.full_name || b.short_name || '').toLowerCase();
const cmp = keyA.localeCompare(keyB);
if (cmp !== 0) return cmp;
const codeA = (a.short_name || '').toLowerCase();
const codeB = (b.short_name || '').toLowerCase();
const codeCmp = codeA.localeCompare(codeB);
if (codeCmp !== 0) return codeCmp;
return a.id - b.id;
```

**null/undefined handling:**
- `a.full_name` could be `undefined` (absent) or `null` (explicitly null, as in the 255-char test fixture at diff line 91). Both `undefined` and `null` are falsy, so `full_name || short_name || ''` handles both correctly — they fall through to `short_name`. ✅
- `a.short_name` could theoretically be absent; the inner `|| ''` prevents a crash. ✅

**Tie breaking:**
- Primary key: `full_name || short_name || ''` → secondary: `short_name || ''` → tertiary: `a.id - b.id` (numeric). This is a total order (id is unique per item), so every pair of items has a definitive ordering. ✅

**Determinism of `localeCompare`:**
`localeCompare` without locale argument uses the runtime default locale. In the Jest/Node environment this is deterministic within a single run. Across environments (CI vs local, different Node versions or OS locales) results could in principle differ for strings with locale-sensitive characters. The fixture strings (`WTO-Phase`, `Fertilize Right Colombia`, `B-A1080`) are all ASCII-range, so locale variation does not apply here. For production data with accented characters (CLARISA project names may include them), the sort key could differ between environments. This is an advisory concern, not a spec violation, as the spec says "deterministic" without mandating a locale.

**Stability across two calls test:**
The test (diff lines 244–255) calls twice with fresh mocks and compares. It PASSED in RED (trivially — unsorted list is self-consistent). Post-fix, it proves the sort produces the same result for the same input on two calls to `listBilateral()`. Since the sort is a pure function of the input data and uses a total order, this is guaranteed. ✅

✅ PASS — Sorts a copy, handles null/undefined, total order via id tiebreak, deterministic for ASCII inputs.
⚠️ ADVISORY (Reliability lens): `localeCompare` without explicit locale could produce different orderings for non-ASCII characters across environments. Consider `localeCompare('', { sensitivity: 'base' })` or `.localeCompare('', undefined, { sensitivity: 'base' })` for future-proofing.

---
## Final Verdict

```
STATUS: PASS

SUMMARY: All 13 T-01 clauses are satisfied across R-BPF-001, R-BPF-002, and R-BPF-006.
The diff is additive (NFR-BPF-001), adds no upstream call (NFR-BPF-003), touches exactly
the two specified files, sorts a copy with a total-order comparator, and uses fixtures
pinned to measured evidence spellings (KZ-001). Five of five RED failures are genuine
regression gates that went green with the fix.

ADVISORY:
1. RELIABILITY — Three new tests passed in RED and therefore carry no RED-gate value:
   "does NOT match on description" (description was never in the old predicate),
   "tolerates absent full_name without throwing" (old predicate never accessed full_name),
   and "produces stable and deterministic order" (unsorted list is trivially stable).
   They do not misrepresent coverage but should not be counted in future evidence audits
   as having served their gate function. Suggest noting in execution.md.

2. RELIABILITY — `localeCompare` without an explicit locale (diff lines 294, 298) is
   deterministic for the ASCII-range fixture strings but may order non-ASCII CLARISA
   project names differently across Node versions or OS locales. Consider pinning
   `localeCompare(keyB, undefined, { sensitivity: 'base' })` if non-ASCII names appear
   in the feed, to guarantee identical ordering on every environment.
```
