# typescript-effect

The TypeScript + Effect + Vitest forms of the general plugins.

Depends on `test-design` and `backend-code-structure`.

- `typescript-effect:using-effect-ts` — Effect return types, method-specific `Data.TaggedError` unions, the repository SPI, handlers with `Effect.gen`, controllers with `Effect.catchTags`, and `@effect/vitest`. Its references give the Effect + Zod + Drizzle forms of the slice patterns.
- `typescript-effect:using-vitest` — fakes instead of `vi.mock`, and fixture factories.

## Extensions

A project adds to a skill with `.claude/extensions/typescript-effect/<skill>.md`, and adds session text with `.claude/extensions/typescript-effect/session.md`. An extension only adds. How dependencies are wired (constructor injection or `Context`/`Layer`) is a project choice for its extension.
