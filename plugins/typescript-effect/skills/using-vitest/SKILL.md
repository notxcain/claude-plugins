---
name: using-vitest
description: Use when writing Vitest tests, encountering vi.mock, vi.fn, vi.spyOn, or mutable let with beforeEach. Use when setting up test fixtures or choosing assertion patterns.
---

# Using Vitest

Vitest forms of the rules in `test-design:designing-tests`.

## Fakes, Not Mocks

Inject a fake through the constructor. Do not use `vi.mock`, `vi.mocked` or `vi.spyOn` to replace a dependency.

```typescript
const fakeRepo = new FakeProductRepository();
fakeRepo.seed(product);
const service = new ProductService(fakeRepo);
```

## Fixtures

Build the subject inside the test, or with a fixture factory. Do not share a mutable fixture that `beforeEach` reassigns.

```typescript
function createFixture(options: {} = {}) {
  const repo = new FakeRepo();
  return { service: new MyService(repo), repo };
}
test('example', () => {
  const { service } = createFixture();
  service.doSomething();
});
```

## Effect-Based Code

For testing Effect-based services, see `typescript-effect:using-effect-ts`, which covers `@effect/vitest` patterns (`it.effect`, `Effect.flip`, etc.).

Project additions: if `.claude/extensions/typescript-effect/using-vitest.md` exists in the project, read it now and follow it as part of this skill.
