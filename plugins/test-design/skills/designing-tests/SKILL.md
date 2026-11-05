---
name: designing-tests
description: Use when writing, modifying, refactoring, reviewing, or auditing a test of any size; when fixing a bug and a test will be written or changed (reproduction or regression); when choosing what to assert, test scope, or test doubles (real, fake, mock); or when planning any of the above before code is touched.
---

# Designing Tests

Group tests by size, not by scope. Size is the set of resources a test may use.

## Test Size Constraints

| Size | Constraints | Examples |
|------|-------------|----------|
| **Small** | One process. No network, database or filesystem. No blocking calls. | A handler test with fake dependencies |
| **Medium** | Localhost network only. A test database is allowed. | A repository test on a real database |
| **Large** | Full network. Real external dependencies. | An end-to-end test on the running system |

Run Small tests on every commit, Medium tests before merge, and Large tests as a gate before merge or release.

## Test Doubles Hierarchy

Prefer, in this order: a real implementation, then a fake. Avoid stubs and mocks.

### State Testing Over Behavior

Assert outcomes and side effects. Do not assert how the code reached them. Do not assert call counts or call order, unless an observer can see them.

```text
test "a created product can be read back"
  product = products.create(newProduct)
  assert product.sku == newProduct.sku
  assert products.getBySku(newProduct.sku) == product

avoid:
  assert repository.create was called 1 time
```

### Fake Guidelines

Every SPI (the interface that a provider implements) has a test suite. The real implementation and the fake must both pass the same suite.

A consumer's SPI suite asserts everything the consumer relies on from the provider, not only what its fake does. A reliance that the suite does not assert is one that the fake can drop with no test failing.

## Test Standards

- **Hermetic**: A test sets up and tears down its own state.
- **Focus**: Test public contracts, not internals.
- **Data**: Generate random data, so that tests can run in parallel.

The stack plugin's test skill gives the library form of these rules.

Project additions: if `.claude/extensions/test-design/designing-tests.md` exists in the project, read it now and follow it as part of this skill.
