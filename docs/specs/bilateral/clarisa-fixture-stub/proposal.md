# Proposal — Serve the PRMS 2026 project data through a CLARISA-shaped stub

> **Headline:** The data is **real** — it simply arrives as a spreadsheet because CLARISA's endpoints do not carry it yet. Convert it once into CLARISA's own response shape, let **our own server** serve it on two routes, and point `ARI_CLARISA_HOST` at that path. **`ClarisaProjectsService` stays byte-for-byte identical**, local and dev work the same way, and no new infrastructure is involved.
>
> **The export is richer than either live feed:** 170 eligible bilateral Alliance projects against **25** today, at phase 2026 — and **198/198 carry a populated, unique `external_code`** with exactly the `{B-, C-}` prefixes S2 specifies. That field is what `bilateral/clarisa-automapper-s2` has been hard-blocked on since 2026-08-14.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/bilateral/clarisa-fixture-stub/` |
| **Slug** | `clarisa-fixture-stub` — **derived from a free-text argument**; the original request is context, not a directory name |
| **Type** | **Change** (temporary data-transport substitution) |
| **Approval Mode** | `gated` |
| **Depends on** | none |
| **Parallel-safe** | **no** — adds a route and touches the JWT exclude list in `app.module.ts` |
| **Module** | `bilateral/` — it exists to serve the bilateral mapping work and S2 |
| **Date** | 2026-08-18 |
| **Requested by** | Juan Carlos Cadavid |
| **Source data** | `/Users/jcadavid/Downloads/prms-projects-20260818.xlsx` — 198 rows × 56 cols, sheet `Projects` |

---

## 2. Intent

Use the real phase-2026 project data **now**, in local *and* dev, to advance the pending bilateral-mapping work while CLARISA's endpoints are still being corrected — without changing how the application consumes that data, and with a clean path back the day the endpoints are ready.

---

## 3. Problem / Current Behavior

The data exists. The transport does not yet.

| Source | Eligible bilateral Alliance projects | `phase` | `external_code` |
| --- | --- | --- | --- |
| `clarisatest-back.ciat.cgiar.org` | 25 | all `2025` | **absent** |
| `api.clarisa.cgiar.org` (prod) | 25 | all `null` | **absent** |
| **PRMS export (this file)** | **170** | 2026 | **198/198, unique** |

*Measured 2026-08-18 with the repo's own predicates from `project-selector.util.ts`.*

Two things are blocked:

1. **The manual picker has never been exercised at realistic volume.** 25 options is not a test of a control that will face ~170.
2. **`bilateral/clarisa-automapper-s2` cannot be developed at all.** Its §12 R-1 records it verbatim: *"Hard block: production has no `external_code`. The match key does not exist there."* The matcher keys entirely on that field, and the export's `Code` column carries exactly the closed `{B-, C-}` prefix set S2 specifies — 145 `C-`, 53 `B-`.

---

## 4. Proposed Outcome

- A committed fixture holding the export **in CLARISA's own response shape**, regenerable by a committed converter.
- Two stub routes served by our own server, enabled only by an env var.
- `ARI_CLARISA_HOST` switches local and dev to it — the same switch already used to move between production and test.
- The picker exercised end to end at ~170 options; S2's matcher developable and measurable against real AGRESSO contracts.
- **A one-line path back** to the real endpoints the day they carry the data.

---

## 5. Scope

**One phase.** Because the server itself hosts the stub, dev is reached by the ordinary deployment — there is no infrastructure step to separate out.

| In | Out |
| --- | --- |
| Converter: Excel → CLARISA-shaped JSON, re-runnable | Any change to `ClarisaProjectsService`, its predicates, or the resolver |
| The fixture, committed under this spec | Implementing S2's matcher — that is S2's own spec |
| Stub routes `POST auth/login` + `GET api/projects`, 404 unless enabled | Fixing the client's error-swallow |
| JWT exclude entry for the stub path | Loading data into CLARISA's own database — that is theirs |
| **Fidelity check** against a captured real CLARISA response | Any UI change |
| `.env.example` documentation + removal condition | Automating the stub's lifecycle |

---

## 6. Non-Goals

- **Not** a branch inside `ClarisaProjectsService`. See §11 — that is the shape this proposal deliberately avoids.
- **Not** a permanent replacement for CLARISA. It carries an explicit removal condition (§13).
- **Not** a way to keep using the spreadsheet after the endpoints are fixed.

---

## 7. Affected Users, Systems, And Specs

| Area | Impact |
| --- | --- |
| `ClarisaProjectsService` + predicates | **None — byte-for-byte identical.** Exercised, never modified |
| `ARI_CLARISA_HOST` | The only switch; already used this way twice today |
| `app.module.ts` JWT exclude list | **+1 entry** — see R-2 |
| `bilateral/clarisa-automapper-s2` | **Development unblocked.** Shipping stays blocked — production still lacks `external_code` |
| Bilateral picker | First exercise at ~170 options |
| DevOps | **None** — the stub ships with the app |

---

## 8. Visual Reference

- **Source:** None — no new UI. The picker and config screens it exercises already exist and are unchanged.

---

## 9. Requirement Delta Preview

### ADDED

- A converter from the PRMS export to CLARISA's response shape.
- A committed fixture of 198 projects in that shape, carrying its own provenance and removal condition.
- Two stub routes, disabled by default.
- A fidelity check asserting the generated shape matches a real CLARISA response field for field.
- One JWT exclude entry.

### MODIFIED

- Nothing in the CLARISA consumption path.

### REMOVED

- Nothing.

---

## 10. How the data is stored

**The fixture carries exactly the 32 fields CLARISA returns. Nothing more.**

Verified against a live response rather than assumed:

| Export column | CLARISA field | In the fixture |
| --- | --- | --- |
| `ID` | `id` | ✅ |
| `Code` | **`external_code`** | ✅ — the field S2 needs |
| `Name` | `full_name` / `short_name` | ✅ |
| `Center Acronym` | `source_center_acronym` | ✅ |
| `Funding Source` | `source_of_funding` | ✅ |
| `Program 1..3` + `Allc %` | `project_mappings_array` | ✅ **with its real nesting** |
| — | `phase` | ✅ set to `2026` |
| FY/Total Budget, Remaining | `total_budget`, `remaining`, `annual` | ✅ — CLARISA returns these |
| **PI Name, PI Email** | *no counterpart* | ❌ **dropped** |
| Pledges, negotiation flags, AOWs/Outputs/Outcomes | *no counterpart* | ❌ dropped |

The dropped columns are dropped **because CLARISA does not return them** — a stand-in that invents fields the original lacks is an unfaithful stand-in (**KZ-001**). That it also keeps Principal Investigator contact details out of git history permanently is a welcome consequence, not the reason.

The **Excel stays out of the repository**. The converter is committed, so a future export regenerates the fixture.

---

## 11. How the data is exposed

**Our own server serves it.** Two routes, reading the fixture:

| Method | Path | Behaviour |
| --- | --- | --- |
| `POST` | `<base>/auth/login` | `{ access_token: 'stub' }` — credentials ignored |
| `GET` | `<base>/api/projects` | The fixture array |

`ARI_CLARISA_HOST` points at it — **note the trailing slash**, since the connection concatenates `host + 'auth/login'`:

| Environment | Value |
| --- | --- |
| local | `http://localhost:3000/api/clarisa-stub/` |
| **dev** | `https://<dev-api-host>/api/clarisa-stub/` |

Same variable, same switch, identical in both — and because the stub ships inside the application, **dev gets it through the ordinary deployment. No new infrastructure, no DevOps step.**

### Why the stub must be a service, not a static file

Discovered while assessing feasibility, not assumed: `clarisa.connection.ts` authenticates on every call, and `getToken()` **throws** when the login fails —

```
.catch((err) => { throw new BadRequestException(err); })
```

— so a missing `auth/login` aborts the whole `get()`. A static host serving only the JSON would fail before reaching it.

### Why this is not the branch-inside-the-service shape

`ClarisaProjectsService` stays **byte-for-byte identical**. It makes the same HTTP call it always makes; only the URL differs, and that is **already environment-configurable**. The domain logic never learns the stub exists.

The rejected shape is an `if/else` *inside* the service, where business logic changes with configuration — which is what **K-005** warns about. Substituting a transport target is not the same thing as branching the consumer.

---

## 12. Risks, Dependencies, And Open Questions

### Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| **R-1** | **KZ-001 — a double that does not evaluate what it stands in for produces a green suite over broken behaviour.** `hasSciencePrograms` reads `project_mappings_array[].global_unit_object.cgiar_entity_type_object.code === 22`. A fixture that flattens that nesting tests a fiction | The fidelity check is a **deliverable, not a nicety**: diff the generated shape against a captured real CLARISA response field by field, and record which fields the export cannot supply |
| **R-2** | **The stub path must join the JWT exclude list.** The server calls it without a JWT. The server guide: *"Don't widen the JWT `exclude` list in `app.module.ts` without a spec + security review"* | This spec is that spec, and it should be reviewed on that point specifically. The route returns **404 unless `ARI_CLARISA_STUB_ENABLED` is set**, so on production it is indistinguishable from not existing |
| **R-3** | **A temporary controller lives in production code until removed** | 404-gated by default; removal condition recorded in §13 and in the fixture itself |
| **R-4** | **K-005 — `ARI_CLARISA_HOST` gains a third possible target.** More chances an environment points somewhere nobody intended | Record which environment points where; the value is visible in each environment's own config, and the phase selector now makes the resulting cohort visible in the UI |
| **R-5** | **K-013 — the export is a point-in-time snapshot** dated 2026-08-18; PRMS will move on | The fixture carries its source file, its date, and its removal condition inline |
| **R-6** | **170 options may break assumptions the picker never faced.** `loadPickerOptions()` documents itself as loading "the first 50", but nothing enforces a limit — the endpoint returns everything passing the filters | A reason to run the test, not a blocker. Expect real findings; each becomes its own bugfix spec |

### Dependencies

None. The stub ships with the application.

### Open Questions

| # | Question | Owner |
| --- | --- | --- |
| **OQ-1** | **Is `Code` genuinely CLARISA's `external_code`, or a PRMS identifier that resembles it?** The `{B-, C-}` prefixes match S2's spec exactly, but that is inference. **S2's entire matcher rests on this** | BA / CLARISA team |
| **OQ-2** | Should the stub also serve S2's other CLARISA dependencies, or only `api/projects`? | — |
| **OQ-3** | Who sets `ARI_CLARISA_STUB_ENABLED` on dev, and who owns turning it off? R-3's removal condition needs a name, or it repeats the unapplied-migration pattern (**K-015**) | DevOps / Product |

*Resolved before drafting: the fixture carries CLARISA's 32 fields only, so redaction is decided by fidelity rather than by policy.*

---

## 13. Success Criteria

1. The converter regenerates the fixture from the export reproducibly.
2. The fidelity check passes **and names what the export cannot supply** — an acknowledged gap beats a silent one.
3. With `ARI_CLARISA_HOST` pointed at the stub, the phases endpoint reports **2026** with a count near **170**, and the picker renders them — in **local and dev**.
4. With the variable pointed back at CLARISA, behaviour returns to today's exactly, with no other change.
5. S2's matcher can be developed and measured against real AGRESSO contracts.
6. **Removal condition, recorded in the fixture and in `.env.example`:** when CLARISA publishes `external_code` and phase-2026 data, the env var is unset and the stub, fixture and converter are **deleted, not maintained**.

---

## 14. Next Step

```text
/akili-specify docs/specs/bilateral/clarisa-fixture-stub
```

Standard depth. **OQ-1 should be answered before design approval** — it decides whether S2 can rely on this data at all. **OQ-3 wants an owner before dev is switched on**, so the removal does not become another thing nobody has been assigned.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
