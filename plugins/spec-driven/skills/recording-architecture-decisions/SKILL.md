---
name: recording-architecture-decisions
description: Use when changing code — your own edits or a diff/PR you are reviewing — to catch when an architecture decision was actually made and propose a human-approved ADR. Also use when an edit contradicts an existing ADR.
---

# Recording Architecture Decisions

Default to silence. Most changes are not decisions, and a false ADR prompt trains the human to ignore every later one. Optimize for **precision, not recall** — decisions you miss get caught when they are re-litigated; decisions you over-report destroy trust in the prompt. Never write an ADR without explicit human approval.

## The Gate

Propose an ADR ONLY when you can name BOTH, concretely:

- a **rejected alternative** that was genuinely viable, and
- a **real reversal cost** — undoing the choice is a project, not a PR.

Can't name both? It was a default, not a decision. Stay silent. A diff that "looks architectural" does not pass the Gate on its own.

Then one more filter: **is the decision already enforced where someone will read it** — a steering line, a linter, the type system? If nothing can silently reverse it, the record has no reader. Reversal cost measures how big the undo is, not how likely someone undoes it unknowingly, and those come apart: a repo-wide convention already stated in a steering doc has an enormous reversal cost and zero ADR value. An ADR earns its keep when **the correct state looks like a mistake** — a redundant-looking column, a duplicate-looking table, a blocking dialog, four join tables where a string would do. Where the correct state looks correct, the code already documents itself.

## Two sources, different fidelity

| Source | What you can see | Your job |
|--------|------------------|----------|
| **You authored the change** | the rejected branches, in your own reasoning | draft the full ADR from your ledger |
| **Someone else authored it** (diff/PR) | only the chosen branch | flag a candidate, **interview** for the why, then draft |
| **A document records the reasoning** (design doc, plan, PR body) | the chosen branch and whichever alternatives the author wrote down | quote the stated reasoning as evidence; never extend past what it says |

A diff never shows what was rejected. For changes you did not author, do not invent rationale — ask: "you chose X over what, and why is it costly to undo?" Inventing the why is worse than no ADR.

Quoting rationale a document already records is evidence, not invention — which is what makes design docs worth mining before they are deleted. A choice a document states with no alternative still fails the Gate; say so by omission rather than reconstructing the author's reasoning.

## Highest-precision signal: contradiction

Before proposing anything, read `docs/adr/`. A change that **contradicts an existing ADR** is almost always record-worthy — either a deliberate supersession (record it) or a mistake (surface it). Reading first also stops you re-proposing what's already decided.

## Candidate signals (structural)

These raise a candidate; they do NOT pass the Gate by themselves — apply the Gate to each:

- a new external dependency
- a new service / module / package boundary
- a change to a cross-cutting concern: auth, persistence, concurrency model, error model, serialization
- one established pattern swapped for another

## Where capture happens

- **Design / brainstorm conclusion — primary.** This is the last point the human is reliably present and the rejected alternatives are still vivid. Make the final step before writing a design doc an ADR-candidates review: list the decisions the design settled, Gate them, and record the approved ones *then*. After design is confirmed there is usually no further interaction — never defer approval to a moment the human won't attend.
- **Commit seam — backstop.** Catches decisions born during implementation that no design session covered. The commit hook flags structural candidates here; you still apply the Gate.

## Workflow

1. **Read** `docs/adr/`. Know what's already decided.
2. **Ledger** — while working, each time you choose among viable approaches, note: choice, rejected alternative(s), reversal cost. Capture at the moment of deliberation; the why is gone later.
3. **At a review seam** — the design-doc conclusion (primary; the human is present) or the commit (backstop) — drop candidates whose change was reverted or abandoned.
4. **Gate** each survivor. For ones that pass, **draft** the ADR and present it for approval. The human edits or approves — never authors from scratch. Approval must cost seconds.
5. **On approval**, write it append-only as `docs/adr/NNNN-kebab-title.md` with the next number. **Supersede — never edit — a prior ADR.** Commit the ADR alongside the code it explains. Specs, design docs and plans are deleted at merge, so an ADR must never be the only place a durable fact lives, and must never point at one of them.

## ADR format

```
# NNNN. <Title>

Status: Proposed | Accepted | Superseded by NNNN
Date: YYYY-MM-DD

## Context
The forces and constraints. Why a decision was needed.

## Decision
What was chosen.

## Rejected alternatives
Each viable option not taken, and why not. (If this is empty, it is not an ADR.)

## Consequences
What this makes easy, hard, or irreversible. Name what breaks if a future reader does not know this — that is who the record is for.

## Revisit when
The condition that makes this decision wrong: the first requirement it cannot serve, and what the change will cost. Omit only when you genuinely cannot name one.
```

A decision deferred with a named trigger is the most valuable record you can write — it tells a future reader when the answer changes instead of only what happened.

## Keep every sentence true until it is superseded

An ADR is append-only, so each sentence must stay true for as long as the decision stands. If an ordinary PR can make a sentence false, that sentence belongs in a steering doc, a rule or the code, not in the ADR.

- **State the criterion, not the instances.** "A route stays hand-written when `route()` cannot type it" survives a new kind; a list of today's kinds does not. Examples are fine when they read as examples ("such as …"), never as the full set.
- **Name the enforcement, don't copy it.** Refer to a rule, package or type by its stable ID and leave its details there.
- **Leave out what drifts**: file paths, line numbers, counts, baselines, lists of current members, PR numbers as proof of current state.
- **Write in present tense, as of the ADR's Date.** Never change a sentence's tense to keep it true.

## Learn from rejections

If the human rejects a class of candidate repeatedly (e.g. dependency bumps), stop proposing it. Their rejection stream defines what *this* project treats as architecturally significant — it is not knowable a priori.

## Red flags — you are about to add noise

- Proposing on a dependency bump, rename, formatting, or config tweak
- Can't name the rejected alternative → it was a default
- Writing rationale for a change you didn't author → interview, don't invent
- Editing an existing ADR instead of superseding it
- Writing a sentence that an ordinary PR can make false → a list of instances, a path, a count
- Writing the ADR without showing it for approval

The PreToolUse commit hook only emits a *structural* candidate. It cannot see rejected alternatives — you still apply the Gate. A hook nudge is not permission to record.

Project additions: if `.claude/extensions/spec-driven/recording-architecture-decisions.md` exists in the project, read it now and follow it as part of this skill.
