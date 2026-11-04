# Writing the model and the checker

## Language

Write the model and the checker in the project's main language, shaped as below. It needs nothing installed, and the project's own test runner runs it.

Move to Quint, TLA+ or Alloy only when the hand-written checker cannot do the job:
- the bounded state space no longer finishes in a few minutes, or
- a rule is about something that must eventually happen (liveness), which a bounded breadth-first search cannot show.

Use such a tool only if the project already has it. Otherwise propose adding it to the operator as a decision; never install it to write a spec.

Either way, traces leave as JSON.

## Shape

```
State      — plain data only: no classes, no clocks, no I/O; serializable, so it can be deduplicated
initial    — the smallest state that makes the rules interesting
steps(s)   — every action enabled in s, each returning:
               label     the action in product words ("admin B removes value X")
               next      the resulting state (equal to s when the action is refused)
               outcome   the result in product words ("refused: 3 people have it")
               cites     the rule IDs, decision IDs, BASELINE numbers (B7), or UNDECIDED
               findings  [{id, kind: "violation" | "undecided" | "conflict"}]
invariants(s) — names of the invariants broken in s
```

- One action is one transaction. Where the code does a use case in several transactions, model each as its own action, so the checker can put other actions between them.
- Bound the universe so the state space stays enumerable: two actors per role, two or three values, one or two entities. Give each counter an upper bound.
- Model refusals as steps whose state is unchanged and whose outcome is the reason. A refusal is behaviour the spec must state.
- A rule written as a property the code must keep (for example "undo restores the previous value") becomes a check on the transition. Report it as a `violation` when any reachable step breaks it.

## Checker

```
seen     = {key(initial)}
frontier = [(initial, [])]
repeat DEPTH times:
  for (s, trace) in frontier:
    for step in steps(s):
      t = trace + [step.label + " → " + step.outcome]
      record the first t for each step.finding and each invariant broken in step.next
      if key(step.next) not in seen: add it, and queue (step.next, t)
```

Breadth-first order makes every recorded trace a shortest one. Raise DEPTH until the findings stop changing or the run gets slow. The report states DEPTH, the bounds of the universe, the number of states and transitions, the invariants broken, the rule and decision IDs reached, and the first trace for each finding.

## Traces for implementations

Export the trace of every open finding, and one trace for each scenario (an answered finding is one, by step 7 of the workflow), as JSON: a list of `{action, params, expected_state}`. In `expected_state`, export what an implementation can observe: what each actor sees (derived views such as a list or a count, per actor) and each field an operation reads back. Bookkeeping only the model needs, such as a counter for the next ID, stays out. Each implementation replays the traces through an adapter that maps an action to its real API and compares the state it observes. A rule no trace exercises is untested in every implementation.
