#!/bin/bash
# AKILI guardrail: a task cannot flip to [x] without Reviewer PASS evidence
# in the same spec's execution.md (evidence before checkbox).
# Scaffolded by /akili-constitution Step 8F. Claude Code PreToolUse hook.
input=$(cat)
fp=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
case "$fp" in
  */docs/specs/*/tasks.md) ;;
  docs/specs/*/tasks.md) ;;
  *) exit 0 ;;
esac
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty')
if [ "$tool" = "Edit" ]; then
  old=$(printf '%s' "$input" | jq -r '.tool_input.old_string // ""')
  new=$(printf '%s' "$input" | jq -r '.tool_input.new_string // ""')
else
  old=$(cat "$fp" 2>/dev/null || printf '')
  new=$(printf '%s' "$input" | jq -r '.tool_input.content // ""')
fi
count_x() { printf '%s' "$1" | grep -o '\[x\]' | wc -l | tr -d ' '; }
[ "$(count_x "$new")" -le "$(count_x "$old")" ] && exit 0
exec_md="$(dirname "$fp")/execution.md"
if [ ! -f "$exec_md" ]; then
  echo "BLOCKED (AKILI guardrail): flipping a task to [x] but $exec_md does not exist. Evidence first: append the execution.md entry with the Reviewer PASS before updating tasks.md (/akili-execute Step 3 order)." >&2
  exit 2
fi
if ! grep -q "PASS" "$exec_md"; then
  echo "BLOCKED (AKILI guardrail): $exec_md contains no PASS evidence. A task reaches [x] only after a Reviewer PASS is recorded (evidence before checkbox)." >&2
  exit 2
fi
exit 0
