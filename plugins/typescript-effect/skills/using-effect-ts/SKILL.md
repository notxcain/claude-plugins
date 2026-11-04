---
name: using-effect-ts
description: Use when writing Effect-based code, services, repositories, or controllers. Use when seeing Effect types, Effect.gen, Effect.fail, catchTags, or testing Effect code with @effect/vitest.
---

# Using Effect TS

Effect TS as the primary concurrency primitive for slice handlers and SPIs. It gives type-safe error handling with explicit error channels and built-in observability.

For the slice method, see `backend-code-structure:extracting-vertical-slices`; [command-patterns.md](references/command-patterns.md) and [query-patterns.md](references/query-patterns.md) give its Effect forms.

## Core Principles

1. **Effect return types** - All async methods return `Effect.Effect<Success, Error>` (omit trailing `never`)
2. **Method-specific error types** - Each method declares its own error union
3. **Domain-specific errors** - Business-level errors, not generic constraint errors
4. **Effect-Promise interop at boundaries** - Controllers use `Effect.runPromise`

## Error Types

Define atomic errors with `Data.TaggedError`, compose into method-specific unions:

```typescript
export class OrganizationNotFoundError extends Data.TaggedError("OrganizationNotFoundError")<{
  readonly organizationId: string;
}> {}

export class DuplicateOrganizationNameError extends Data.TaggedError("DuplicateOrganizationNameError")<{
  readonly name: string;
}> {}

// Method-specific unions (NOT service-level)
export type CreateOrganizationError = DuplicateOrganizationNameError;
export type UpdateOrganizationError = OrganizationNotFoundError | DuplicateOrganizationNameError;
```

## Repository SPI Pattern

Queries read the database directly, never through a repository.

```typescript
export interface OrganizationRepository {
  // Write: fail with domain-specific errors
  insert(org: Organization): Effect.Effect<void, DuplicateOrganizationNameError>;
  update(org: Organization): Effect.Effect<void, DuplicateOrganizationNameError>;

  // Read: never fail (return null or [])
  findById(id: string): Effect.Effect<Organization | null>;
  findByName(name: string): Effect.Effect<Organization | null>;

  // Delete: idempotent (never fails)
  delete(id: string): Effect.Effect<void>;
}
```

## Handler Pattern with Effect.gen

**REQUIRED**: Use `Effect.gen({ self: this }, function* () { ... })` for instance access.

```typescript
export class CreateOrganizationCommandHandler {
  constructor(private readonly organizationRepo: OrganizationRepository) {}

  handle(command: CreateOrganizationCommand): Effect.Effect<OrganizationView, CreateOrganizationError> {
    return Effect.gen({ self: this }, function* () {
      const existing = yield* this.organizationRepo.findByName(command.name);
      if (existing) {
        return yield* Effect.fail(new DuplicateOrganizationNameError({ name: command.name }));
      }

      const org = Organization.create({ id: command.id, name: command.name });
      yield* this.organizationRepo.insert(org);
      return org.toView();
    }).pipe(
      Effect.withSpan("organizations/create", {
        attributes: { organizationName: command.name }
      })
    );
  }
}
```

## Controller Integration

**REQUIRED**: Produce `Effect.Effect<HttpResponse>` before `Effect.runPromise`.

Use `Effect.catchTags` for discriminated union errors:

```typescript
app.post('/organizations', async (c) => {
  const command = CreateOrganizationCommand.parse(await c.req.json());

  return await createOrganization.handle(command).pipe(
    Effect.map(org => c.json(org, 201)),
    Effect.catchTags({
      DuplicateOrganizationNameError: (error) =>
        Effect.succeed(c.json({ error: `Organization '${error.name}' already exists` }, 400)),
    }),
    Effect.runPromise
  );
});
```

## Testing with @effect/vitest

**REQUIRED**: Use `@effect/vitest` for Effect-based tests.

```typescript
import { Effect } from 'effect';
import { it } from '@effect/vitest';
import { describe, expect } from 'vitest';

describe('CreateOrganizationCommandHandler', () => {
  it.effect('creates an organization', () =>
    Effect.gen(function* () {
      const { handler } = createTestContext();
      const result = yield* handler.handle(command({ name: 'Acme Corp' }));
      expect(result.name).toBe('Acme Corp');
    })
  );

  it.effect('fails when the name is taken', () =>
    Effect.gen(function* () {
      const { handler } = createTestContext();
      yield* handler.handle(command({ name: 'Acme Corp' }));

      // Use Effect.flip to capture errors
      const error = yield* Effect.flip(handler.handle(command({ name: 'Acme Corp' })));
      expect(error).toBeInstanceOf(DuplicateOrganizationNameError);
    })
  );
});
```

**Key Elements**:
- `it.effect(name, () => Effect.gen(...))` - Test function that runs Effect
- `yield*` to unwrap Effect values (no `Effect.runPromise` needed)
- `Effect.flip` to capture and assert on error channel values
- The test context builds the handler with fake repositories (see `using-vitest`)

## Quick Reference

| Pattern | Usage |
|---------|-------|
| `Effect.gen({ self: this }, function* () {...})` | Handler methods with instance access |
| `yield*` | Unwrap Effect values |
| `Effect.fail(new Error(...))` | Return typed error |
| `Effect.withSpan("name", {attributes})` | Add observability |
| `Effect.catchTags({...})` | Handle discriminated errors |
| `Effect.runPromise` | Convert to Promise at boundaries |
| `it.effect()` | Vitest test for Effect code |
| `Effect.flip` | Capture error channel for assertions |

Project additions: if `.claude/extensions/typescript-effect/using-effect-ts.md` exists in the project, read it now and follow it as part of this skill.
