## Feature development (spec-driven)

Feature development follows **Requirements → Software Design → Plan**.

- Requirements: `spec-driven:authoring-requirements`. Software design: `spec-driven:crafting-design-docs`. Plan: the plan skill you have.
- Plan phases are vertical: each phase ends at a state that can be exercised end-to-end. Never sequence phases by layer — not all the schema, then all the services, then all the API.
- A plan needs no review: the requirements and design reviews gate the change. Start implementing a plan as soon as it is written.

### Change scaffolding

Specs, design docs and plans belong to one change. Write them to `docs/plans/YYYY-MM-DD-<name>-{requirements,design,plan}.md`, commit them on the change's branch so reviewers read them against the diff, and delete them in the same pull request before merge.

Anything that must outlive the change is promoted before deletion, into one of exactly four places:
- an ongoing constraint → a line in the relevant project steering document
- an architecture decision (a viable alternative was rejected, and reversing it would be a project) → an ADR in `docs/adr/`, via `spec-driven:recording-architecture-decisions`
- the reason behind one non-obvious behavior → a comment on the test that encodes it
- a rule, decision, call or scenario from the spec → a test that encodes it (`spec-driven:covering-spec-rules`)

Not promoted means deliberately lost.

### Specification adherence

- Implement only what the specification states.
- Add no convenience methods, utilities or features that the specification does not name.
- If something seems missing from the specification, ask; do not assume it should be added.
- Keep interfaces minimal and exactly as specified.
