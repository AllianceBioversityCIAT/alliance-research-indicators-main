# Judgment Day — Changes / Control Lists: global lists read by key

| Field | Value |
| --- | --- |
| Target | `design.md` judged against `requirements.md`, `proposal.md` and the delivered Control Lists code — frozen at commit `892a6c1c` |
| Mode | Blind dual review (Judge A, Judge B), read-only, identical prompt and scope; model `sonnet` (author `opus` — author ≠ auditor) |
| Skills passed to both | nestjs-expert, api-design-principles, angular-developer, error-handling-patterns |
| Round | 1 (no fixes applied yet) |
| Date | 2026-10-13 |

## 1. Merged ledger

`Both` = reported by both judges (corroborated). `Severity` = as each judge rated it.

| # | Finding | A | B | Severity A / B | Status |
| --- | --- | --- | --- | --- | --- |
| J-1 | Seed gate "fresh schema; re-run adds 0; counts 2/6/23" has no mechanism: the seed is inline after `CREATE TABLE`, a migration cannot be re-run, suites run on a non-empty DB | A-1 | B-3 | **CRITICAL / WARNING** | **Severity contradiction → human decision** |
| J-2 | Link replacement "in one transaction" has no mechanism (repositories bound to their own entity manager, no `DataSource` in the service); no gate can show a partial write; archived rule 8 "no transaction needed" not retired | A-2 | B-5 | WARNING / WARNING | Corroborated · info |
| J-3 | §2.1 controller row says remove `portfolioId` from A13, but A13 keeps it as an optional filter (`@ApiQuery required:false`, summary text) | A-4 | B-7 | WARNING / WARNING | Corroborated · info |
| J-4 | §3.1 local DB procedure: `migration:revert` uses `src`, `migration:execute` uses `dist` (stale build re-runs the old migrations); "revert three times" ignores the new `…003`; target DB (CORE vs TEST, possibly shared Dev) not named; `migration:test:*` scripts not used | A-5 | B-1, B-17 | WARNING / WARNING | Corroborated · info |
| J-5 | T-01's integration gates depend on the revert-and-rerun that §14 assigns to T-03 (last) | A-6 | B-2 | WARNING / WARNING | Corroborated · info |
| J-6 | "Uniqueness only in code" gate cannot fail: the service pre-check returns 409 before the DB index is reached; needs a raw-SQL duplicate (`ER_DUP_ENTRY`) and/or `SHOW INDEX` | A-7 | B-4 | WARNING / WARNING | Corroborated · info |
| J-7 | `portfolioIds` DTO under-specified: `UpdateControlListValueDto` is a `PickType` with an explicit list (A11 would 400 the field); `null` vs omitted vs `[]`; element type, uniqueness; Swagger | A-8 | B-10 | WARNING / WARNING | Corroborated · info |
| J-8 | Proposal body (and parts of requirements) contradict the later decisions: §5/§6/§9/§13 "no portfolio / no new migration / no filters", §7 "same roles", §12 "sidebar untouched"; requirements §7 says both "new migration 003" and "no new migration"; R-CLG-006 and `down` order omit 003; R-CLG-004 "`activeOnly` is the only parameter"; glossary *Admin* and personas still Center Admin | A-9 | B-12, B-14 | WARNING / WARNING, SUGGESTION | Corroborated · info |
| J-9 | Links to a **soft-deleted** portfolio: FK never fires, `findOne`/`findAll` hide inactive portfolios → nameless ids in A9, a PATCH resending them gets 400, A13 for that id 404, a value restricted only to it is offered to nobody | A-11 | B-9 | WARNING / WARNING | Corroborated · info |
| J-10 | Role/route tests: `app.routes.spec.ts` asserts the old path + `centerAdminGuard` and is not listed; a boolean-mock guard test cannot tell roles 1 / 7 / 9 apart; R-CLG-008 AC.3 (old route gone) has no gate; leftover grep excludes sidebar/routes | A-12 | B-8 | WARNING / WARNING | Corroborated · info |
| J-11 | A10/A11 response shape and client types: only A9/A13 said to return `appliesTo`; interface lacks `appliesTo` / `portfolioIds`; link ids may come back as BIGINT strings | A-15 | B-11 | SUGGESTION / WARNING | Corroborated · info |
| J-12 | R-CLG-001 says every category/list endpoint rejects `portfolioId`, but only A1, A3, A4, A6, A7 have a validating DTO; design §10 tests only A1, A3 | A-16 | B-15 | SUGGESTION / SUGGESTION | Corroborated · info |
| J-13 | Seed claims: FROM-less `SELECT … WHERE NOT EXISTS` (use `FROM DUAL`); "no lookup can silently match zero rows" false for the values seed (joins `control_lists`); entities have no relation/index metadata to "drop"; A13 filter mechanism (`QueryBuilder` + `Brackets`) not named | A-17 | B-16 | SUGGESTION / SUGGESTION | Corroborated · info |
| J-14 | §12.1 "three other modules" import `PortfoliosModule` — it is four; `portfolios.service.ts:137-140` is `:139-141` | A-18 | B-18 | SUGGESTION / SUGGESTION | Corroborated · info |
| S-1 | §4 intro says roles "unchanged" while §8 changes them; controller header comment says Technical Support is "deliberately NOT granted" | A-3 | — | WARNING | Suspect |
| S-2 | New link entity is not an `AuditableEntity` (root `CLAUDE.md` §4.1) without a decision entry; a links-only update would not touch the value's `updated_by` | A-10 | — | WARNING | Suspect |
| S-3 | Removing Control Lists leaves the nested-children sidebar rendering with no user and drops its tests (`alliance-sidebar.component.spec.ts:301-366`) | A-13 | — | WARNING | Suspect |
| S-4 | §6 "Load: one call (A1)" vs loading portfolios for *Applies to*; failure state of that call undefined | A-14 | — | SUGGESTION | Suspect |
| S-5 | Reusing `assertPortfolioExists` gives **404** on A10/A11, but R-CLG-009 requires **400** naming `portfolioIds` | — | B-6 | WARNING | Suspect |
| S-6 | `family.md` F-2/F-3 still say "a screen's spec decides how", contradicting value-level applicability (D-CLG-9) | — | B-13 | WARNING | Suspect |
| S-7 | `refreshPortfolioSummaries` (component `:502, :564, :574-576`) not named in the client removal list | — | B-19 | SUGGESTION | Suspect |

## 2. Counts

| Confirmed severe (both CRITICAL) | Severity contradictions | Corroborated non-severe | Suspects | Contradictions on existence |
| --- | --- | --- | --- | --- |
| 0 | 1 (J-1) | 13 | 7 | 0 |

## 3. Decision required

J-1 exists for both judges but its severity is contested → per protocol, escalated to the requester before any correction.

## 4. Rounds

| Round | Action | Result |
| --- | --- | --- |
| 1 | Judges A and B on `892a6c1c` | Ledger above; awaiting requester decision on J-1 and on whether corroborated WARNINGs are corrected in the same pass |

## 5. Round 1 correction

Requester decision (2026-10-13): treat **J-1 as severe** and correct it together with every corroborated finding (J-2…J-14) and the suspects S-1…S-7. Correction applied by the orchestrator to `design.md`, `requirements.md`, `proposal.md` and `family.md`.

| Finding | Correction |
| --- | --- |
| J-1 | Seed extracted into exported functions (D-CLG-11); new seed suite re-runs them → 0 affected rows; checks by seeded id range |
| J-2 | `DataSource.transaction` with manager-scoped repositories; 1062 mapping wraps it; archived rule 8 retired for value writes; atomicity integration test |
| J-3 | Controller row: A13 `portfolioId` `required:false`, summary text, service signature |
| J-4 | §3.1 rewritten: TEST DB via `migration:test:*`; app DB only if local, with `migration:dev:execute`; revert by name; link table + index checks |
| J-5 | New T-00 (HITL) runs §3.1 before T-01's integration gate |
| J-6 | Raw-SQL duplicate insert + `SHOW INDEX` + stubbed pre-check unit test; K-004 red proof |
| J-7 | DTO rules: `PickType` list, `@ValidateIf` null → 400, `@IsArray @ArrayUnique @IsInt({each}) @Min(1,{each})`, Swagger |
| J-8 | Proposal body rewritten; requirements summary, glossary, personas, R-CLG-004, R-CLG-006, §7 fixed |
| J-9 | D-CLG-14: inactive links hidden on read, `appliesToAll`, writes accept active ids only; scenario + test |
| J-10 | `app.routes.spec.ts`, real-`RolesService` guard tests, old-route grep |
| J-11 | A10/A11 return `appliesTo`/`appliesToAll`; client types; `Number()` coercion |
| J-12 | R-CLG-001 narrowed to A1, A3, A4, A6, A7; tests list them |
| J-13 | `FROM DUAL`; values-seed claim softened; entity row reworded; A13 `QueryBuilder` + `Brackets` |
| J-14 | Four other importers; `:139-141` |
| S-1 | §4 says roles change per §8; controller header comment updated |
| S-2 | D-CLG-12: link entity not audited; parent value stamped on every link change |
| S-3 | Dormant nested rendering kept, covered by a synthetic-group test |
| S-4 | Portfolios loaded in parallel at init; failure disables the *Applies to* field |
| S-5 | Separate write validator → 400; A13 → 404; `PortfoliosService` no longer injected (D-CLG-13) |
| S-6 | `family.md` F-2/F-3 amended for value applicability |
| S-7 | `refreshPortfolioSummaries` listed for removal |
