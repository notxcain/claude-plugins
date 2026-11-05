#!/usr/bin/env bash
# PreToolUse(Bash) hook — advisory ADR signal at the commit seam.
#
# Emits a STRUCTURAL candidate only; all judgment lives in the
# spec-driven:recording-architecture-decisions skill. Never blocks; fails open.
#
# The project names its layout in .claude/extensions/spec-driven/adr-signal.json:
#   { "boundaries": [globs], "migrations": [globs], "manifests": [globs] }
# Each key is optional and replaces its default. A glob's `*` matches across `/`,
# and a leading `**/` also matches at the repository root.
set -uo pipefail

INPUT="$(cat)"
CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || true)"

case "$CMD" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

CWD="$(printf '%s' "$INPUT" | jq -r '.cwd // ""' 2>/dev/null || true)"
[ -n "$CWD" ] && cd "$CWD" 2>/dev/null
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$ROOT" 2>/dev/null || exit 0
git rev-parse HEAD >/dev/null 2>&1 || exit 0

CONFIG="${CLAUDE_PROJECT_DIR:-$ROOT}/.claude/extensions/spec-driven/adr-signal.json"
if [ -f "$CONFIG" ]; then
  jq -e 'type == "object"' "$CONFIG" >/dev/null 2>&1 || exit 0
  json="$(cat "$CONFIG")"
else
  json='{}'
fi

# The globs for one key, one per line: the project's, or the default.
globs() {
  if printf '%s' "$json" | jq -e --arg k "$1" 'has($k)' >/dev/null 2>&1; then
    printf '%s' "$json" | jq -r --arg k "$1" '.[$k][]? | strings' 2>/dev/null
  else
    printf '%s\n' "${@:2}"
  fi
}

BOUNDARIES="$(globs boundaries)"
MIGRATIONS="$(globs migrations '**/migrations/**')"
MANIFESTS="$(globs manifests '**/package.json' '**/build.sbt' '**/go.mod' '**/Cargo.toml' '**/pyproject.toml')"

# matches <path> <globs>: true when the path matches one of the globs.
matches() {
  local path="$1" g
  while IFS= read -r g; do
    [ -n "$g" ] || continue
    # shellcheck disable=SC2053 # the glob is meant to match as a pattern
    [[ "$path" == $g ]] && return 0
    case "$g" in '**/'*) [[ "$path" == ${g#\*\*/} ]] && return 0 ;; esac
  done <<<"$2"
  return 1
}

CHANGED="$(git diff --cached --name-only 2>/dev/null)"
[ -z "$CHANGED" ] && CHANGED="$(git diff --name-only HEAD 2>/dev/null)"
[ -z "$CHANGED" ] && exit 0

# Already recording an ADR in this commit → stay silent.
printf '%s\n' "$CHANGED" | grep -qE '(^|/)docs/adr/.*\.md$' && exit 0

ADDED="$(git diff --cached --name-only --diff-filter=A 2>/dev/null)"
[ -z "$ADDED" ] && ADDED="$(git diff --name-only --diff-filter=A HEAD 2>/dev/null)"

SIGNALS=""
add_signal() { SIGNALS="${SIGNALS:+$SIGNALS; }$1"; }

manifest=""
while IFS= read -r f; do
  [ -n "$f" ] && matches "$f" "$MANIFESTS" && { manifest=1; break; }
done <<<"$CHANGED"
[ -n "$manifest" ] && add_signal "dependency manifest changed"

# New module or service boundary: an added file under a directory that matches a
# boundary glob and did not exist in HEAD. The directory has as many path segments
# as the glob.
NEW_DIRS=""
while IFS= read -r g; do
  [ -n "$g" ] || continue
  depth="$(printf '%s' "$g" | awk -F/ '{ print NF }')"
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    [ "$(printf '%s' "$f" | awk -F/ '{ print NF }')" -gt "$depth" ] || continue
    d="$(printf '%s' "$f" | cut -d/ -f1-"$depth")"
    # shellcheck disable=SC2053
    [[ "$d" == $g ]] || continue
    git cat-file -e "HEAD:$d" 2>/dev/null && continue
    case " $NEW_DIRS " in *" $d "*) continue ;; esac
    NEW_DIRS="${NEW_DIRS:+$NEW_DIRS }$d"
  done <<<"$ADDED"
done <<<"$BOUNDARIES"
[ -n "$NEW_DIRS" ] && add_signal "new module/service boundary ($NEW_DIRS)"

migration=""
while IFS= read -r f; do
  [ -n "$f" ] && matches "$f" "$MIGRATIONS" && { migration=1; break; }
done <<<"$ADDED"
[ -n "$migration" ] && add_signal "schema migration added"

[ -z "$SIGNALS" ] && exit 0

read -r -d '' MSG <<EOF || true
Potential architecture decision in this commit (${SIGNALS}). Before committing, apply the spec-driven:recording-architecture-decisions skill: check the Gate — a genuinely viable rejected alternative AND a real reversal cost. If it passes and no existing docs/adr/ entry covers it, draft an ADR for human approval and include it in this commit. If it does not pass, ignore this notice.
EOF

jq -c -n --arg m "$MSG" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", additionalContext: $m}}' 2>/dev/null || true
exit 0
