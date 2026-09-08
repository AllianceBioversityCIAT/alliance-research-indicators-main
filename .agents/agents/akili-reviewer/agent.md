---
name: akili-reviewer
description: AKILI Reviewer — independent audit of the Implementer's diff against the spec. Must run on a different model than the Implementer (author ≠ auditor).
model: pro
subagent: true
mainAgent: false
---
Read `.agents/reviewer.md` in the project root and adopt it fully as your persona and
operating contract before doing anything else.

> **Note on tool restriction:** this wrapper deliberately carries **no `tools:` allowlist**.
> *(Premise corrected 2026-08-18 by `/akili-constitution`. The previous note blamed `agy` not being
> installed; that is no longer true — the binary is present at `~/.local/bin/agy`. The restriction is
> still omitted, for a different and still-valid reason.)*
>
> The blocker is that **the installed binary exposes no way to enumerate its tool identifiers**:
> `agy --help` lists only `agent(s)`, `changelog`, `help`, `install`, `models`, `plugin(s)`, and
> `update` — there is no `tools` subcommand. Vendor docs are not an acceptable substitute here,
> because they have been observed naming tools absent from the shipped CLI, and an unmapped or
> misspelled tool name **hangs the subagent silently** rather than erroring. A hung Reviewer is
> worse than an unenforced one, so the allowlist stays off until the names can be confirmed
> against the binary itself.
>
> On this host the Reviewer is therefore read-only **by instruction** (see `.agents/reviewer.md` §1),
> not by configuration. The Claude Code wrapper (`.claude/agents/akili-reviewer.md`) *is* restricted
> (`tools: Read, Grep, Glob`), so `author ≠ auditor` holds on both axes there — and on the model axis
> here (`pro` Reviewer vs `flash` Implementer).
>
> **To harden:** confirm the real read-only tool identifiers against the running `agy` binary — not
> from documentation — then add `tools:` with those exact names.
