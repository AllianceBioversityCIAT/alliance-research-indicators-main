# SDD Design Template — ARI Server

> **This is a methodology template, not a feature design.** Every module-level spec under `docs/specs/<module>/<feature>/design.md` MUST follow this format.

---

## 0. File header

```markdown
# Design — <Module> / <Feature>

- **Module:** results | indicators | agresso | clarisa | opensearch | reports | admin-panel | <other>
- **Spec id:** <same as requirements.md>
- **Status:** draft | in-review | approved | implemented | superseded
- **Owner:** <name / squad>
- **Linked requirements:** ./requirements.md
- **Linked detailed design:** ../../../trd/trd.md (sections X, Y)
- **Last updated:** <YYYY-MM-DD>
```

---

## 1. Goals & non-goals

- **Goals**: bullet list, ≤ 5. Each maps to one or more requirements.
- **Non-goals**: bullet list. Be explicit; this is where you fence the spec.

Do NOT restate requirements. Link to them.

---

## 2. Architecture

Describe the slice of the system this feature changes.

- Use the canonical module layout (`domain/entities/<module>/` or `domain/tools/<integration>/`).
- Diagrams are encouraged (ASCII or linked image). Diagrams MUST be reproducible from text (mermaid, etc.).
- Highlight the boundary with `shared/` cross-cutting concerns (interceptors, guards, pipes, filters).
- If the feature spans multiple modules, list the module owners.

### 2.1 Composition

For every new file, list path + responsibility:

```markdown
- `src/domain/entities/<module>/<feature>.controller.ts` — HTTP edge for <feature>.
- `src/domain/entities/<module>/<feature>.service.ts` — business logic for <feature>.
- `src/domain/entities/<module>/dto/<feature>.dto.ts` — request DTOs.
- `src/domain/entities/<module>/repositories/<feature>.repository.ts` — query encapsulation (if needed).
- `src/domain/shared/...` — only if a generally reusable concern; otherwise keep it module-local.
```

### 2.2 Reuse

- List existing services / utilities / guards / pipes the feature consumes (`RolesGuard`, `ResultStatusGuard`, `LoggerUtil`, `ResultsUtil`, `ClarisaService`, `AgressoStaffService`, etc.).
- DO NOT duplicate logic. If reuse requires a refactor, list it as an explicit task in `task.md`.

---

## 3. Data model

For each entity created, changed, or referenced:

- Path + class name.
- Columns added / modified / removed (TypeORM column options + DB type).
- Indexes added (named per `idx_<table>_<purpose>` convention).
- Relations (`@ManyToOne`, `@OneToMany`, etc.) — mirror existing `Result` patterns.
- OpenSearch decoration (`@OpenSearchProperty({...})`) when the field must be searchable.
- Migration filename: `<timestamp>-<camelCaseAction>.ts` under `src/db/migrations/`.
- Backfill plan: in a separate migration or one-off admin endpoint.

If the feature does NOT touch data, state "No data model changes." explicitly.

---

## 4. API surface

For every endpoint:

```markdown
### <METHOD> /api/v<n>/<path>

- **Controller:** <file path>
- **Roles:** @Roles(<...SecRolesEnum>)
- **Guards:** RolesGuard, ResultStatusGuard (when applicable)
- **Interceptors:** SetUpInterceptor / others
- **Path tokens:** `:result-code` (resolved via @GetResultVersion)
- **Query params:** (kebab-case, with `ListParseToArrayPipe` / `QueryParseBool` as needed)
- **Body DTO:** <file path>
- **Response data shape:** <TypeScript signature; envelope is implicit>
- **Swagger:** @ApiTags, @ApiOperation, @ApiQuery, @ApiBody, @ApiBearerAuth (REQUIRED)
- **Errors:** 400 / 401 / 403 / 404 / 409 — list each with the `errors` payload it returns.
- **Notes:** rate-limit policy, idempotency key, etc.
```

Mark breaking changes explicitly and bump the URI version (`@Version('2')`).

---

## 5. Workflows & business rules

Use numbered steps. Be explicit about:
- Status workflow gates (which `result_status_workflow` rows apply).
- Audit fields written.
- Side effects: OpenSearch reindex, Socket.IO emit, RabbitMQ message, DynamoDB write, sync_process_log entry.
- Transactional boundaries (`QueryRunner`, `Repository.manager.transaction`).
- Rollback / compensation behavior on partial failure.

---

## 6. Frontend (Admin SSR panel) impact

Skip unless the spec adds or changes an admin page.

- Affected files under `src/admin/client/`.
- New route added to `App.tsx` and matching `AdminController` handler.
- New service method on `AdminService`.
- New sidebar entry.
- Tokens / styles changes (kept inside `src/admin/client/styles/admin.css` for now).

For STAR (sibling repo) impact, link to its spec; do NOT make changes to `client/` from an ARI spec.

---

## 7. Integration impact

For every external system touched (CLARISA, AGRESSO, TIP, ROAR, OpenSearch, DynamoDB, RabbitMQ, Socket.IO, Azure):
- Files under `src/domain/tools/<integration>/` touched.
- New env vars (with default + source of truth).
- New cron jobs or modifications (`@Cron` expression + window).
- New message / event contracts (name + payload TS type).

---

## 8. Security & authorization

Always answer:
- Who can call each endpoint (roles, status guard rules)?
- Does the feature accept the machine token (`client_id/client_secret`)? If yes, which `app_secret_host_list` rows must exist?
- New secrets or rotated credentials?
- PII or donor-restricted data? If yes, link to the compliance OQ in the PRD and propose handling.

---

## 9. Observability

- New log lines (level + structured fields).
- New `sync_process_log` row types.
- Metrics / dashboards (note CloudWatch namespace if applicable).
- Tracing (if introduced).

---

## 10. Testing strategy

Mirror the test layout (`*.spec.ts` sibling files). Specify:
- Unit tests required (services, guards, pipes, interceptors touched).
- E2E tests for new endpoints (`test/jest-e2e.json`).
- Coverage threshold target if differing from global 60%.
- Mock strategy for external systems.

---

## 11. Rollout

- Migration order: when do schema changes deploy vs. code?
- Feature flag: env var? `app_config` row? Default value?
- Backout: how do we revert (migration revert path + code rollback)?
- Comms: who needs to be notified (STAR team, partners, MEL)?

---

## 12. Design decisions log

Append-only:

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| D-<feature>-1 | <YYYY-MM-DD> | <decision> | <why> |

Decisions converted to baseline (ux-ui/design or trd) MUST also be added there.

---

## 13. Open questions

Bullet list. Each with owner + due date. When closed, move to the decisions log.

---

## 14. References

- Related ADRs (none yet; create under `docs/decisions/` if introduced).
- Detailed design sections by number.
- Linked Jira tickets / GitHub issues.
