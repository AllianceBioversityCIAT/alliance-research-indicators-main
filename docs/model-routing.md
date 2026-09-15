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
| **T1** | Architect | Hardest design/synthesis: constitution, TRD, multi-module design, **`tasks.md` decomposition**, and **live orchestration judgment** (skill selection, FAIL adjudication, pivot). |
| **T2** | Coder | High-throughput implementation and test authoring. |
| **T3** | Auditor | Independent, skeptical review; spec-conformance gatekeeping. |
| **T4** | Context-Ingest | Large-context repository ingestion and summarization. |
| **T5** | Fast-Cheap | Task tracking, status transitions, archive/bookkeeping. (Orchestration moved to T1 — it is judgment, not dispatch.) |
| **T6** | Multimodal | Screenshots, diagrams, design-image reasoning. |

---

## Phase → Tier Mapping

| AKILI phase | Tier | Notes |
| --- | --- | --- |
| `/akili-constitution` (ingest) | T4 | Repository ingestion. |
| `/akili-constitution` (synthesis) | T1 | PRD/UX/TRD baseline. |
| `/akili-propose` | T1 | Deep problem framing. |
| `/akili-specify` | T1 | Requirements/design/tasks authoring. |
| `/akili-execute` — Leader | T1 | Orchestration judgment — decomposition in flight, skill selection per Implementer, FAIL adjudication, pivots. Writes no code, but this is reasoning, not dispatch. |
| `/akili-execute` — Implementer | T2 | Writes the code. |
| `/akili-execute` — Reviewer | T3 | **Must differ from the Implementer model.** |
| `/akili-test` — Leader | T1 | Orchestration judgment — partitions suites, selects each Tester’s skills, adjudicates results. Writes no tests. |
| `/akili-test` — Tester(s) | T2 | Test authoring; **prefer ≠ Implementer** (author ≠ tester). |
| `/akili-validate` | T3 | Requirement/design conformance. |
| `/akili-audit` | T3/T4 | Drift detection across code + docs. |
| `/akili-quick` | T5 | Trivial changes. |
| `/akili-archive` | T5 | Kaizen + bookkeeping. |

---

## Model Registry

> **Alias-first rule:** the Claude Code column uses floating aliases (`opus`, `sonnet`, `haiku`) — they always resolve to the latest generation, so this registry survives model churn with zero edits. Pin a dated model ID only when deliberately freezing a version, and record why. OpenCode slugs are concrete (no alias mechanism); confirm them against your roster.

**Updated: 2026-08**

| Tier | Claude Code | OpenCode | Antigravity | Fallback |
| --- | --- | --- | --- | --- |
| T1 Architect | `opus` | `<CONFIRM SLUG>` | `pro` | `sonnet` |
| T2 Coder | `sonnet` | `opencode-go/glm-5.1` `<CONFIRM>` | `flash` | `sonnet` |
| T3 Auditor | `opus` | `opencode-go/deepseek-v4-pro` `<CONFIRM>` | `pro` | `opus` |
| T4 Context-Ingest | `sonnet` | `<CONFIRM SLUG>` | `flash` | `haiku` |
| T5 Fast-Cheap | `haiku` | `opencode-go/deepseek-v4-flash` `<CONFIRM>` | `flash` | `haiku` |
| T6 Multimodal | `opus` | `<CONFIRM SLUG>` | `pro` | `sonnet` |

### Enforced bindings (`/akili-execute`, `/akili-test`)

The `.claude/agents/akili-*` wrappers turn the mapping above into enforcement:

| Wrapper | Persona | Model |
| --- | --- | --- |
| `akili-leader` | `.agents/leader.md` | `opus` (T1) — *corrected 2026-09-15: this row read `haiku` (T5) while the wrapper has said `model: opus` all along. The mirror in `CLAUDE.md` was right and this canonical table was wrong, which is the drift direction that matters most* |
| `akili-implementer` | `.agents/implementer.md` | `sonnet` (T2) |
| `akili-reviewer` | `.agents/reviewer.md` | `opus` (T3) — **≠ implementer** |
| `akili-tester` | `.agents/tester.md` | `sonnet` (T2) |

---

## Execution Hosts & Orchestration (standing arrangement)

> **User ruling 2026-09-15 — this is the DEFAULT for every AKILI activity in this repo.** It does
> not need to be restated at the start of a session. If a run departs from it, say so and why.

**The split.** Claude Code **plans, reviews and adjudicates; it does not write production code.**
Implementation goes to other hosts, and the independent audit goes to a third — so `author ≠ auditor`
holds across **model families**, not merely across two instances of one family.

| Role | Host | CLI | Model | Why this one |
| --- | --- | --- | --- | --- |
| **Leader** — plan, decompose, select skills/effort, adjudicate FAILs, decide pivots, write the audit trail | Claude Code | `claude` | `opus` (T1) | Orchestration judgment: low volume, high leverage |
| **Implementer — server** (`server/researchindicators`) | **Codex** | `codex exec` | **`gpt-5.6-terra`** (`--effort medium`) | Standing user instruction: *"no se necesita un super modelo pensante para ejecutar"*. **`gpt-5.6-terra`** is *"Balanced agentic coding model for everyday work"*; **`gpt-6-astra`** is *"our most capable model for complex, demanding work"* — i.e. exactly the deep reasoner this rule declines. See the model table below |
| **Implementer — client** (`client/research-indicators`) | **Cursor** | `cursor-agent -p` | `cursor-grok-4.6-*`; Cursor may pick the best available | Same rule, client lane |
| **Reviewer** — read-only spec-conformance audit | **Antigravity** | `agy` | **`gemini-3.1-pro-high`** — the *thinking* tier, **never `*-flash`** | Cross-family independence from both implementers |

**Tester** follows the Implementer's lane (server → Codex, client → Cursor) and must differ from the
model that wrote the code under test.

### Orchestration runs through Orca — not through generic subagent spawns

`Run → Task → Dispatch` provenance, injected lifecycle preambles, and `worker_done` authority are the
whole point; a generic agent-spawn API creates a useful worker with **none** of them. Load the
`orchestration` skill, then `orca skills get orchestration` for the version-matched guide (the guide
is served by the binary on purpose so it cannot drift from it).

```bash
orca status --json                                   # runtime must be ready
orca orchestration run-create --objective "<text>" --json
orca orchestration task-create --spec "<task>" --json
orca orchestration worker-start --task <id> --worktree current --agent codex  --model <id> --json
orca orchestration worker-start --task <id> --worktree current --agent cursor --model <id> --json
orca orchestration check --wait --types worker_done,escalation,question --timeout-ms 900000 --json
orca orchestration worker-release --dispatch <id> --json   # after each accepted worker_done
```

### Host facts — verified 2026-09-15, re-verify before planning a dispatch

| Host | Command | Status |
| --- | --- | --- |
| Claude Code | `claude` | Confirmed |
| **Codex** | `codex` → `~/.local/bin/codex`, **v0.154.0**. Non-interactive: `codex exec`. Flags: `-m/--model`, `-s/--sandbox read-only\|workspace-write\|danger-full-access`, `--approve-for-me`, `--skip-git-repo-check` | ✅ **Working.** ⚠️ **`codex login status` saying "Logged in" does NOT mean usable** — on 2026-09-15 it reported logged-in while every request returned **HTTP 402 `deactivated_workspace`**, falling back WebSocket→HTTPS and failing on both with 5 retries each. A **billing/workspace** state, not a config one, and invisible to the auth check. Resolved by the user switching to the correct workspace. **Always smoke-test, never trust the login line** |
| **Cursor** | `cursor-agent` → `~/.local/bin/cursor-agent`, **v2026.08.25**. Non-interactive: `-p/--print` (has write + shell tools), `--output-format text\|json\|stream-json`, `--model`, `--list-models`, `--force`/`--yolo`, `--workspace` | ✅ **Working**, logged in. `cursor-agent status` reports the account. Catalog includes **both** `cursor-grok-4.6-*` **and** the full `gpt-5.3-codex-{low,,-high,-xhigh}` family — so Cursor is a viable **fallback executor for server work** if the Codex CLI is ever down again |
| **Antigravity** | `agy` (**not** `antigravity`) | ✅ Installed. Headless needs `--dangerously-skip-permissions` (even a file read is auto-denied without it). **Effort is baked into the slug**, so `--model gemini-3.1-pro-high` is the whole selection |
| OpenCode | `opencode` | Installed; **unusable on this account** (`Insufficient balance`). Re-check before planning around it |

**Codex model slugs — read them from `~/.codex/models_cache.json`, never infer them (probed 2026-09-15):**

| Slug | Description (verbatim from the cache) | Default effort | Use for |
| --- | --- | --- | --- |
| `gpt-6-astra` | *"Our most capable model for complex, demanding work."* | `low` | ❌ Not the execution tier — this is the deep reasoner the standing rule declines |
| `gpt-5.6-terra` | *"Balanced agentic coding model for everyday work."* | `medium` | ✅ **Default Implementer model** |
| `gpt-5.6-sol` | *"Reliable agentic workhorse for everyday tasks."* | `medium` | ✅ Equivalent alternative |
| `gpt-5.6-luna` | *"Fast and affordable agentic coding model."* | `medium` | Trivial/mechanical tasks |
| `gpt-5.5` | *"Proven previous-generation model…"* | `xhigh` | Fallback only |
| `gpt-reserve`, `codex-auto-review` | hidden (`visibility: hide`) | — | Do not select |

⚠️ **Three slugs that look right and are NOT accepted:** `gpt-5.3-codex`, `gpt-6-codex` and **`gpt-6`**
all return `400 … not supported when using Codex with a ChatGPT account`. The last one is the
instructive failure: `codex exec` with **no** `-m` works, and asking that session *"what model are
you?"* answers **`gpt-6`** — so the value was taken as fact and passed back as `-m gpt-6`, which the
API rejected. **A model's self-report is not its API identifier.** The worker launched, looked
healthy to `worker-show` (`state: ready`, `status: dispatched`), and failed only inside the TUI —
Orca cannot see an in-TUI model error, so this is a *silent* failure mode. `models_cache.json` is the
authority; verify a slug with a one-line `codex exec -m <slug> --sandbox read-only` before dispatching.

**`agy models` re-probed 2026-09-15 — 15 slugs, unchanged from the 2026-09-09 probe:**
`gemini-3.8-flash-{high,medium,low}` · `gemini-3.7-flash-{high,medium,low}` ·
`gemini-3.6-flash-{high,medium,low}` · `gemini-3.1-pro-{high,low}` · `claude-sonnet-4-6` ·
`claude-opus-4-6-thinking` · `gpt-oss-120b-medium`.
⚠️ **`gemini-3.1-pro` has only `-high` and `-low` — there is NO `-medium`**, a hole exactly where a
T1/T3 task would reach for the middle. This list has been wrong **twice, in opposite directions**
(a model listed that was gone; a model omitted that existed) — **re-probe, never carry it forward.**

### Two traps that have already cost time here

1. **Antigravity is NOT reachable through `worker-start --model`.** That flag's help says it supports
   *"Claude, Codex, and Cursor opaque provider model ids"* only, and `worker-start --agent gemini` was
   confirmed disabled (`agent_unconfigured`) on this install. Launch Antigravity via
   `orca terminal create --command "agy …"` then `orca orchestration dispatch --inject`, which
   preserves full Run/Task/Dispatch provenance. *(A bogus-task probe does **not** settle whether an
   `--agent` id is valid — the call fails on `task_not_found` first, before the agent id is checked.)*
2. **Confirm the target is live before dispatching, with a real one-line smoke run.** A guessed binary,
   an unpaid workspace, or a shell that is not running an agent all accept the dispatch and produce
   **silence**, and the failure then shapes the whole plan. Both the OpenCode `Insufficient balance`
   and the Codex `402` were found this way — each in one cheap probe, before any task depended on it.

**Quota is per-model, not per-account.** `claude-sonnet-4-6` once exhausted mid-run (`Resets in 2h54m`)
while every gemini model kept answering. Plan the fallback **by model**, and expect `author ≠ auditor`
to degrade to same-family separation when the tier that runs out is the one holding a role alone.

---

## How to change models

To change models, **edit only this registry table** (and the matching `## Model Routing` block in `AGENTS.md` / `CLAUDE.md`, plus the wrapper `model:` field when you want the change enforced). Never pin a dated model name where a floating alias exists. Model selection is guidance only in command prompts — never add `model:` to command frontmatter; enforced bindings live only in the Step 8E agent wrappers.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
