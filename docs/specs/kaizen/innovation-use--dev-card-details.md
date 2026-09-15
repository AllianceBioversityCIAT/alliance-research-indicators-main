# Kaizen Entry — `innovation-use/dev-card-details`

| Field | Value |
| --- | --- |
| Spec | archived → `docs/specs/archive/2026-09-11-innovation-use--dev-card-details` |
| Date | 2026-09-11 |
| Branch | `AC-1679-…` — **spec branch** |

## Metrics

| Signal | Count |
| --- | --- |
| Tasks | T-01…T-09 PASS; **T-04 and T-10 `[~]`** at archive, closed on QA sign-off |
| Reviewer rework | multiple rounds; `T-08` needed a clause fix at attempt 3 |
| Final gates | **317 suites / 6951 tests** · build exit 0 · lint clean |
| Judgment findings | severe findings incl. a type-break and an NFR the design covered only partially |

## Lessons

### KZ-L1 — Asserting from a partial read produced three separate false claims in one run

- **Root cause.** Three distinct errors of the same species: a 400-character grep that could not see a `const`, a false universal about dark greys, and a partial-read assertion. **All three asserted a property from an excerpt instead of opening the source.** Two further worker justifications were false-but-harmless and corrected in the record only — including a claim the server would *"likely"* reject a request, where both halves were false.
- **Why it recurred three times in one run.** Nothing in the loop distinguishes *"I read this"* from *"I read a window onto this."* A grep hit reads like a file read in a report.
- **Evidence.** `execution.md`, final review rounds — the three are enumerated there as *"third error of this species in the run."*
- **Severity.** High. **Target:** Product + Methodology. **This is a K-014 recurrence** (a filtered view of output is not the output), extended from commands to **file reads**.

## Noted, not a lesson

- **The advisory rule held under pressure.** Six advisories from the final round were recorded and none was minted into a task, including one naming a reset-dependent dead end that was tempting to fix.
- **T-10 never got agent evidence and the record says so.** It closed on QA's sign-off, which is the same class of evidence by a different route — not an agent claiming a visual check it could not perform.

## Pending Items

| # | Kind | Target | Content | Severity | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | `digest-update` | `kaizen-log.md` → **K-014** | Recurrence **+3** (one run). Extend the lesson beyond commands to **file reads**: *"a grep window is not the file. Three false claims in one run were each asserted from an excerpt — including a grep too short to contain the `const` that falsified it."* | **High** | `pending` |
| 2 | `product-followup` | `app-custom-tag` (shared component) | `[statusBackground]` is a declared input the component **never reads** — it applies only `color` and `border-color`, so the badge renders transparent instead of filled. Affects every consumer of the OICR card pattern | Medium | `pending` |
| 3 | `product-followup` | Innovation Dev card wrapper | `rs-gap-[16]` became `gap-2` — 16px to 8px and off the responsive scale | Low | `pending` |
