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
> The Antigravity CLI (`agy`) was not installed when `/akili-constitution` generated this file,
> so the tool names could not be confirmed against the installed binary — and an unmapped or
> misspelled tool name **hangs the subagent silently** rather than erroring. On this host the
> Reviewer is therefore read-only **by instruction** (see `.agents/reviewer.md` §1), not by
> configuration. To harden it: install `agy`, confirm the real read-only tool identifiers
> against the binary, then add `tools:` with those names — never copy them from vendor docs,
> which have been observed naming tools absent from the shipped CLI.
> The Claude Code wrapper (`.claude/agents/akili-reviewer.md`) *is* restricted
> (`tools: Read, Grep, Glob`), so `author ≠ auditor` holds on both axes there.
