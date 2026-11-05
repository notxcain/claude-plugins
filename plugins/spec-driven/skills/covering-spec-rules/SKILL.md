---
name: covering-spec-rules
description: Use when turning a spec's scenarios, rules, decisions, calls and invariants into tests, or when listing spec coverage in a PR. Also use when writing a characterization or regression test, or when a test encodes a deliberate decision.
---

# Covering Spec Rules

The spec is deleted at merge, so the tests are the only lasting record of what the system does. Every scenario, rule, decision, call and invariant of the spec lands in a test. Before the scaffolding is deleted, list each one with its test in the PR description. One with no test is either untested behavior or was never a requirement; the reviewer decides which.

Test sizes (Small, Medium, Large) are the ones in `test-design:designing-tests`.

- **Scenarios.** Each scenario in the spec's scenarios file becomes one Medium test: real command and query handlers of every domain it crosses, on the test database. Run its `given` steps first, then each step in order, and after each one assert the state the scenario expects. Keep a scenario's steps in one test: their order is what it checks. A step with no handler behind it, such as opening a dialog, becomes the data the next call sends: the version it read, or the count it showed. Write the steps and assertions into the test itself; nothing that survives the merge reads the scenarios file. Name the test for the outcome that sets the scenario apart.
- **Invariants and transition checks.** Each becomes a helper that the scenario tests run after every step. It computes the expected answer from the test's own seeded data, never with the code under test.
- **Rules, decisions and calls no scenario cites.** Each lands as a test named for it: `When <actor> <does>` → `Then <outcome>`. A decision that ratifies existing behavior is covered by the test that pins its B, and gets no test of its own.
- **Surfaces.** Each screen or dialog the design names where a spec outcome shows gets at least one end-to-end test in the owning domain's suite that shows an outcome there (see `test-design:writing-e2e-ui-tests`). Component tests cover its other outcomes.
- **Must not change.** A test that the spec's `baseline.md` names as protecting existing behavior keeps its assertions. Changing one changes the spec, so raise it in review.

A characterization or regression test is named for the behavior it pins. Every other test checks a design contract, such as a handler's error types, its branches, or its effects through its SPIs, and is named for that contract, never for a rule.

A journey across domains belongs to the domain whose rules it records, which is almost always the consumer. Its end-to-end tests live in that domain's suite, whichever apps they open. Its scenario tests live where the handlers of the domains it crosses are wired together.

Where a test encodes a deliberate decision rather than an obvious one, comment the reason on the test. Without it the next reader — most often an agent making the suite green — sees an obstacle instead of a decision.

Project additions: if `.claude/extensions/spec-driven/covering-spec-rules.md` exists in the project, read it now and follow it as part of this skill.
