# backend-code-structure

How to structure backend application code as vertical slices.

Depends on `test-design`.

- `backend-code-structure:extracting-vertical-slices` — extract service methods into slices: defactor, split queries from commands, branded requests, typed failures, the slice test sizes, and the code smells to refactor after (`references/code-smells.md`).

## Example notation

Examples use typed pseudocode in `text` fences. Types, the error union (`-> A | E1 | E2`) and dependencies (constructor parameters) are always written. `fail E` ends a handler with error `E`. A step that a library does is a verb (`db.find`, `span "orders/get"`). A stack plugin, such as `typescript-effect`, gives the same patterns in its language.

## Extensions

A project adds to the skill with `.claude/extensions/backend-code-structure/extracting-vertical-slices.md`, and adds session text with `.claude/extensions/backend-code-structure/session.md`. An extension only adds.
