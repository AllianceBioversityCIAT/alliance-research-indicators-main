# SDD Requirements Template — ARI Server

> **This is a methodology template, not a feature spec.** Every module-level spec under `docs/specs/<module>/<feature>/requirements.md` MUST follow this format. The `/sdd-specify` skill consumes this template.

---

## 0. File header

Every requirements file MUST start with:

```markdown
# Requirements — <Module> / <Feature>

- **Module:** results | indicators | agresso | clarisa | opensearch | reports | admin-panel | <other>
- **Spec id:** <YYYY-MM>-<short-slug> (e.g. 2026-05-controlled-editing)
- **Status:** draft | in-review | approved | implemented | superseded
- **Owner:** <name / squad>
- **Linked PRD section:** <link to docs/prd.md anchor>
- **Linked tickets:** <Jira / GitHub issue ids>
- **Last updated:** <YYYY-MM-DD>
```

If the spec supersedes or extends another spec, add `Supersedes:` / `Extends:` lines pointing to it.

---

## 1. Context

A short (≤ 200 words) statement of:
- What the feature is.
- Why it is needed now (link to PRD goal / open question / incident).
- Who asked for it.
- What is explicitly NOT changing.

Do NOT restate the PRD. Link to it.

---

## 2. Requirement numbering

Every requirement gets a unique id of the form `R-<MODULE>-<NNN>`:
- `<MODULE>` = uppercase short module slug (e.g. `RES`, `IND`, `AGR`, `CLA`, `OS`, `REP`, `ADM`).
- `<NNN>` = zero-padded ordinal within the spec.

Example: `R-RES-001`, `R-RES-002`, ... .

Requirements MUST be numbered in dependency order where possible (foundational first).

---

## 3. Functional requirements

Each functional requirement uses this structure:

```markdown
### R-<MODULE>-<NNN> — <one-line title>

- **As a** <persona from PRD §3>
- **I want** <capability>
- **So that** <outcome / business value>

**Details:**
- Inputs: <DTO fields, query params, headers>
- Behavior: <bullet list of the rules>
- Outputs: <ServerResponseDto shape: status, description, data type>
- Errors: <expected HTTP errors + `errors` payload>
- Permissions: <required roles from SecRolesEnum; status guard requirements>

**Acceptance criteria** (testable, observable):
- [ ] AC.1 — <observable assertion>
- [ ] AC.2 — <observable assertion>
- [ ] AC.3 — <observable assertion>

**Out of scope (for this requirement):**
- <bullet>
```

Rules:
- Every AC MUST be observable from the API or DB; no internal-only ACs.
- ACs MUST reference the `ServerResponseDto` envelope shape (status + description + data shape).
- For role-restricted handlers, ACs MUST cover both "allowed role" and "denied role" cases.
- For status-guarded handlers, ACs MUST cover at least one allowed and one denied result-status transition.

---

## 4. Non-functional requirements

Use the same `R-<MODULE>-<NNN>` numbering, prefixed `NFR-`:

```markdown
### NFR-<MODULE>-<NNN> — <title>

- **Category:** performance | security | observability | scalability | reliability | compliance | a11y | dx
- **Target:** <measurable target, e.g. p95 ≤ 300 ms at 50 RPS>
- **How verified:** <load test / unit test / code review / runbook>
```

Common categories the ARI server enforces by default (you may inherit without restating):
- All endpoints return `ServerResponseDto` (D-1).
- All endpoints are versioned at `/api/v{n}` (D-2).
- All mutations are audited via `AuditableEntity` (PRD AC-Auth, AC-Results-Lifecycle).
- All exceptions flow through `GlobalExceptions` (PRD AC-API-Surface).

State an NFR only if it differs from the inherited defaults.

---

## 5. Data requirements

If the feature touches data:
- List affected entities (file paths) and the columns added / changed / removed.
- Note any new indexes (mirror the `idx_<entity>_<purpose>` naming used on `Result`).
- Note any new OpenSearch fields (`@OpenSearchProperty(...)` placement on the entity).
- Note required migrations (`migration:generate` filename pattern: `<timestamp>-<camelCaseAction>.ts`).
- Note backfill or data-correction needs as a separate requirement (not inline in a migration).

---

## 6. API surface delta

For each new or changed endpoint:
- Method + URL (with `:result-code` and other path tokens).
- Required `@Roles(...)` + guards.
- Query/body DTO file path.
- Response envelope (just declare data shape; envelope is implicit).
- Versioning: keep existing `/v1` unless adding a breaking change (then add `/v2`).
- Swagger annotations REQUIRED.

Document `client_id/client_secret` machine-token visibility per endpoint when relevant.

---

## 7. Cross-system impact

If the feature affects:
- **CLARISA / AGRESSO / TIP / ROAR / OpenSearch / DynamoDB / RabbitMQ** — list the integration files touched and the new contract.
- **Socket.IO** — list every new event name and payload shape.
- **STAR (`client/`)** — link to the matching STAR spec; never modify the STAR repo from an ARI spec.

---

## 8. Assumptions, dependencies, risks

- Carry forward only assumptions that are NOT already in the PRD.
- Dependencies on other in-flight specs MUST be linked by spec id.
- Risks SHOULD include a mitigation note.

---

## 9. Open questions

Bullet list. Every open question MUST have an owner and a target resolution date. Convert resolved questions into "Design decisions" in the corresponding `design.md`.

---

## 10. Sign-off

Each spec MUST list reviewers + status at the bottom:
```
- [ ] Engineering lead — <name>
- [ ] MEL / product owner — <name>
- [ ] Security review (if auth/secrets touched) — <name>
- [ ] DevOps (if infra touched) — <name>
```
