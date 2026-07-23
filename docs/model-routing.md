# Model Routing — Alliance Research Indicators (ARI)

> Canonical, editable model-selection registry for this monorepo. This is **guidance** (plus the enforced wrappers in `.claude/agents/akili-*`). Mirrored into the `## Model Routing` section of the root `AGENTS.md` and `CLAUDE.md`.

---

## Philosophy (criteria-first)

Match the model to the **dominant demand of the phase**, not to a habit. Guiding principles:

- **ARCHITECT = BUILDER.** Deep design and deep implementation want the same high-capability tier.
- **Author ≠ auditor.** The Reviewer must run on a **different model** than the Implementer; the Tester should too (reduces confirmation bias).
- **Reserve deep reasoning** for propose/design/verify. Use **fast & cheap** for orchestration, task bookkeeping, and archive.

---

## Capability Tiers

| Tier | Name | One-line definition |
| --- | --- | --- |
| **T1** | Architect | Hardest design/synthesis: constitution, TRD, multi-module design. |
| **T2** | Coder | High-throughput implementation and test authoring. |
| **T3** | Auditor | Independent, skeptical review; spec-conformance gatekeeping. |
| **T4** | Context-Ingest | Large-context repository ingestion and summarization. |
| **T5** | Fast-Cheap | Orchestration, task tracking, status transitions, archive. |
| **T6** | Multimodal | Screenshots, diagrams, design-image reasoning. |

---

## Phase → Tier Mapping

| AKILI phase | Tier | Notes |
| --- | --- | --- |
| `/akili-constitution` (ingest) | T4 | Repository ingestion. |
| `/akili-constitution` (synthesis) | T1 | PRD/UX/TRD baseline. |
| `/akili-propose` | T1 | Deep problem framing. |
| `/akili-specify` | T1 | Requirements/design/tasks authoring. |
| `/akili-execute` — Leader | T5 | Orchestration only, no production code. |
| `/akili-execute` — Implementer | T2 | Writes the code. |
| `/akili-execute` — Reviewer | T3 | **Must differ from the Implementer model.** |
| `/akili-test` — Leader | T5 | Suite fan-out orchestration. |
| `/akili-test` — Tester(s) | T2 | Test authoring; **prefer ≠ Implementer** (author ≠ tester). |
| `/akili-validate` | T3 | Requirement/design conformance. |
| `/akili-audit` | T3/T4 | Drift detection across code + docs. |
| `/akili-quick` | T5 | Trivial changes. |
| `/akili-archive` | T5 | Kaizen + bookkeeping. |

---

## Model Registry

> **Alias-first rule:** the Claude Code column uses floating aliases (`opus`, `sonnet`, `haiku`) — they always resolve to the latest generation, so this registry survives model churn with zero edits. Pin a dated model ID only when deliberately freezing a version, and record why. OpenCode slugs are concrete (no alias mechanism); confirm them against your roster.

**Updated: 2026-07**

| Tier | Claude Code | OpenCode | Fallback |
| --- | --- | --- | --- |
| T1 Architect | `opus` | `<CONFIRM SLUG>` | `sonnet` |
| T2 Coder | `sonnet` | `opencode-go/glm-5.1` `<CONFIRM>` | `sonnet` |
| T3 Auditor | `opus` | `opencode-go/deepseek-v4-pro` `<CONFIRM>` | `opus` |
| T4 Context-Ingest | `sonnet` | `<CONFIRM SLUG>` | `haiku` |
| T5 Fast-Cheap | `haiku` | `opencode-go/deepseek-v4-flash` `<CONFIRM>` | `haiku` |
| T6 Multimodal | `opus` | `<CONFIRM SLUG>` | `sonnet` |

### Enforced bindings (`/akili-execute`, `/akili-test`)

The `.claude/agents/akili-*` wrappers turn the mapping above into enforcement:

| Wrapper | Persona | Model |
| --- | --- | --- |
| `akili-leader` | `.agents/leader.md` | `haiku` (T5) |
| `akili-implementer` | `.agents/implementer.md` | `sonnet` (T2) |
| `akili-reviewer` | `.agents/reviewer.md` | `opus` (T3) — **≠ implementer** |
| `akili-tester` | `.agents/tester.md` | `sonnet` (T2) |

---

## How to change models

To change models, **edit only this registry table** (and the matching `## Model Routing` block in `AGENTS.md` / `CLAUDE.md`, plus the wrapper `model:` field when you want the change enforced). Never pin a dated model name where a floating alias exists. Model selection is guidance only in command prompts — never add `model:` to command frontmatter; enforced bindings live only in the Step 8E agent wrappers.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
