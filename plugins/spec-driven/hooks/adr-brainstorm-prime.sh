#!/usr/bin/env bash
# PostToolUse(Skill) hook — primes design and brainstorm sessions to end with an
# ADR-candidates review, the last point the human is reliably present.
#
# Reads the hook payload on stdin. Emits PostToolUse additionalContext JSON only
# for the skills that settle architecture; otherwise prints nothing. Fails open.
set -uo pipefail

skill="$(jq -r '.tool_input.skill // ""' 2>/dev/null || true)"

case "$skill" in
  superpowers:brainstorming | spec-driven:crafting-design-docs) ;;
  *) exit 0 ;;
esac

read -r -d '' addendum <<'EOF' || true
Architecture decisions:

This session is a primary place architecture decisions get made, and once the design is confirmed there is usually no further human interaction. Make the FINAL step before writing the design doc an ADR-candidates review, while the human is still present:
- List each architecture decision this session settled and the genuinely viable alternatives it rejected.
- Apply the spec-driven:recording-architecture-decisions Gate to each: a real rejected alternative AND a real reversal cost. Anything failing the Gate was a default, not a decision — drop it silently.
- Get the human's approval on which become ADRs, then write the approved ones now, while the reasoning is fresh.

Decisions that instead emerge during implementation are caught separately at the commit seam.
EOF

jq -c -n --arg ctx "$addendum" \
  '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}' 2>/dev/null || true
exit 0
