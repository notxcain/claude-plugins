#!/usr/bin/env bash
# Change scaffolding and ADR gate, for a project's CI.
#
#   scaffolding-gate.sh --base <ref> --adr-dir <dir> [--scaffolding <pathspec>]...
#                       [--only adr|scaffolding] [--format plain|github]
#
# ADR Gate: an ADR is never deleted or renamed since <ref>; only the Status line of an
# existing ADR changes; no ADR names a scaffolding path.
# Scaffolding Gate: no file under a scaffolding pathspec is tracked.
#
# Exit 0: no findings. 1: findings, one per line. 2: bad arguments or an unknown base ref.
set -uo pipefail

usage() {
  echo "usage: scaffolding-gate.sh --base <ref> --adr-dir <dir> [--scaffolding <pathspec>]... [--only adr|scaffolding] [--format plain|github]" >&2
  exit 2
}

base=""
adr_dir=""
only=""
format="plain"
scaffolding=()

while [ $# -gt 0 ]; do
  case "$1" in
    --base) [ $# -ge 2 ] || usage; base="$2"; shift 2 ;;
    --adr-dir) [ $# -ge 2 ] || usage; adr_dir="$2"; shift 2 ;;
    --scaffolding) [ $# -ge 2 ] || usage; scaffolding+=("$2"); shift 2 ;;
    --only) [ $# -ge 2 ] || usage; only="$2"; shift 2 ;;
    --format) [ $# -ge 2 ] || usage; format="$2"; shift 2 ;;
    *) usage ;;
  esac
done

[ -n "$base" ] && [ -n "$adr_dir" ] || usage
case "$only" in "" | adr | scaffolding) ;; *) usage ;; esac
case "$format" in plain | github) ;; *) usage ;; esac

if ! git rev-parse --verify --quiet "${base}^{commit}" >/dev/null; then
  echo "scaffolding-gate: unknown base ref: $base" >&2
  exit 2
fi

status=0

report() {
  if [ "$format" = github ]; then
    printf '::error file=%s::%s\n' "$1" "$2"
  else
    printf '%s: %s\n' "$1" "$2"
  fi
  status=1
}

adr_gate() {
  echo "ADR Gate"
  local f edits p

  while IFS= read -r -d '' f; do
    report "$f" "An ADR is never deleted or renamed. Supersede it with a new ADR."
  done < <(git diff -z --name-only --diff-filter=DR "$base" HEAD -- "$adr_dir")

  while IFS= read -r -d '' f; do
    edits=$(git diff -U0 "$base" HEAD -- "$f" | grep -E '^[-+]' | grep -vE '^(\+\+\+|---) ' | grep -vE '^[-+]Status: ' || true)
    if [ -n "$edits" ]; then
      report "$f" "Only the Status line of an existing ADR may change. Record the new decision as a new ADR that supersedes this one."
    fi
  done < <(git diff -z --name-only --diff-filter=M "$base" HEAD -- "$adr_dir")

  [ ${#scaffolding[@]} -gt 0 ] || return 0
  while IFS= read -r -d '' f; do
    for p in "${scaffolding[@]}"; do
      case "$p" in :*) continue ;; esac # a magic pathspec is not a path an ADR can name
      if grep -qF -- "${p%/}/" "$f"; then
        report "$f" "An ADR points at change scaffolding, which is deleted at merge. Put the fact in the ADR itself."
        break
      fi
    done
  done < <(git ls-files -z -- "$adr_dir")
}

scaffolding_gate() {
  echo "Scaffolding Gate"
  [ ${#scaffolding[@]} -gt 0 ] || return 0
  local f
  while IFS= read -r -d '' f; do
    report "$f" "Change scaffolding must not reach the main branch. Delete it, or promote what must last, in this pull request."
  done < <(git ls-files -z -- "${scaffolding[@]}")
}

[ "$only" = scaffolding ] || adr_gate
[ "$only" = adr ] || scaffolding_gate

exit $status
