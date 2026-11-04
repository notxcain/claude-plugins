# Grounding the baseline

The spec states what exists today in product words. This file, `baseline.md` beside the model, holds the evidence, the writer inventory and the platform inventory. Keep paths, line numbers and test names here, never in the spec: they are for the people who check the baseline, and they change with every refactor.

## One entry per behaviour

```markdown
## B7 · A track archive asks to confirm the number, 0 too, then interrupts the attempts in progress at its steps

- **Owner:** [the team that owns the subsystem]
- **Evidence:** e2e test · `[suite] › [test name]`
- **Also:** unit test `[file] › [test name]`; code `[path]:[lines]`
- **Status:** verified
```

An unverified behaviour names the test that will settle it, and who writes it:

```markdown
- **Status:** unverified. Characterization test: e2e, in [our suite], written by [us | owner], before the build starts
```

Each item the spec's scope says must not change gets an entry too, in the same form, headed by the item instead of a B number, unless a B already states it. Its evidence names the existing tests that protect it.

## Writer inventory

One row per writer of the state the feature reads. Fill it before you write the model.

```markdown
| Writer | State it changes | In the model |
|---|---|---|
| [handler, background job, admin tool or other domain's adapter] | [the state, in product words] | modelled as action `[label]` · or · out of scope: [reason] |
```

A use case that spans several transactions, such as upload, then background indexing, then confirm, gets one row per transaction.

## Platform inventory

One row per mechanism the feature builds on, such as a schema service, a storage layout or a job queue. Fill it before you write the model, and again when the operator changes the frame of the feature.

```markdown
| Mechanism | Can express | Cannot express | Evidence |
|---|---|---|---|
| [service or module] | [the shapes of state it holds, such as relation cardinalities] | [what it cannot hold or change, such as two values in one column, or a change in place] | code · `[path]` › `[symbol]` |
```

Record what the mechanism allows, not what its seeded or default data contains: a default is a starting value, never a limit. A state no mechanism can express needs a platform change: list it as an open decision, never model it silently.

## Evidence, strongest first

1. **An e2e test that shows the behaviour.** It is observable, and it holds whoever owns the code.
2. **A unit or integration test**, where the code is ours to see.
3. **The published contract:** the API description or the schema.
4. **The owning team's confirmation**, with who confirmed it and when.
5. **Reading the code**, for a subsystem we own. Weaker than any test.
6. **An observation on a running environment**, with the steps written down.

The spec's status says **verified** only for kinds 1 and 2. Every other kind is **unverified** until a test exists.

An existing test is enough only for the parts of a behaviour it observes. Split the behaviour into its parts, and give each part no test observes a characterization test of its own. A behaviour whose every part a test already shows needs no new test.

## A subsystem another team owns

When we define the spec but see only their e2e suites and their API:

- Ground each behaviour in their e2e tests and their contract. Code is not available, so kinds 2 and 5 are out.
- Write each characterization test as an e2e test in our own suite, against their API or UI.
- Offer those tests to the owning team as consumer contract tests. Then a change of theirs that breaks the baseline fails their build instead of our feature.
- Take the writer inventory from their API surface: every operation that changes the state the feature reads. Have the owning team confirm it, and record the confirmation as kind 4.
- Without contract tests in their build, the baseline can go stale silently. Give the spec the date the baseline was confirmed.
