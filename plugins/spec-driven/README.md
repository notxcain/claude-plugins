# spec-driven

Spec-driven feature development: Requirements → Software Design → Plan, with change scaffolding that is deleted at merge and promoted into durable places.

Depends on `test-design`.

## Skills

- `spec-driven:authoring-requirements` — a spec whose source of truth is an executable behaviour model.
- `spec-driven:crafting-design-docs` — what a design doc includes and excludes.
- `spec-driven:recording-architecture-decisions` — when a change was an architecture decision worth an ADR, and how to write it.
- `spec-driven:covering-spec-rules` — how each scenario, rule, decision and invariant of a spec lands in a test.

## Session text

`session.md` is printed at session start: the workflow, the change scaffolding, the four places to promote to, and specification adherence.

## Hooks

- PostToolUse(Skill): after `superpowers:brainstorming` or `spec-driven:crafting-design-docs` loads, it asks for an ADR-candidates review before the design doc is written.
- PreToolUse(Bash): on `git commit`, it emits a structural ADR signal (a changed manifest, a new module boundary, an added migration). The project names its layout in `.claude/extensions/spec-driven/adr-signal.json`:

  ```json
  { "boundaries": ["modules/*/*"], "migrations": ["**/migrations/**"], "manifests": ["**/package.json"] }
  ```

  Each key is optional and replaces its default. The defaults are no boundaries, `**/migrations/**`, and the usual manifest names (`package.json`, `build.sbt`, `go.mod`, `Cargo.toml`, `pyproject.toml`).

## Scaffolding gate for CI

```
bin/scaffolding-gate.sh --base <ref> --adr-dir <dir> [--scaffolding <pathspec>]...
                        [--only adr|scaffolding] [--format plain|github]
```

- ADR Gate: an ADR is never deleted or renamed since `<ref>`; only the `Status:` line of an existing ADR changes; no ADR names a scaffolding path.
- Scaffolding Gate: no file under a scaffolding pathspec is tracked.
- Exit 0: no findings. 1: findings, one per line. 2: bad arguments or an unknown base ref.

Check out this repository at the project's pinned tag in CI and call the script from there.

## Conventions and extensions

Scaffolding lives in `docs/plans/`, and ADRs in `docs/adr/`. A project that uses other paths says so in its extensions: `.claude/extensions/spec-driven/<skill>.md` per skill, and `.claude/extensions/spec-driven/session.md` for session text. An extension only adds.
