---
name: writing-e2e-ui-tests
description: Use when writing Playwright end-to-end UI tests: suite ownership, fixture data, authentication setup, what an e2e spec may not fake.
---

# Writing E2E UI Tests

End-to-end tests prove the screens and dialogs where a spec's outcomes show. Smaller tests prove the rules behind them. E2E tests are Large tests (see `test-design:designing-tests`).

## Suite Ownership

A suite is owned by the domain whose user stories it records. It may open any app that the story reaches.

A journey across domains goes in the suite of the domain whose story it is. That is almost always the consumer.

## Authentication

Sign the standing account in once, in a setup step, and save the session. Specs take a page that is already signed in. A spec that signs somebody in by hand uses a page with no session.

Open a signed-in page only for an app that the story reaches.

## Fixtures

Declare fixture data next to the suite that owns it. A spec imports only from its own suite and from shared data, never from another suite.

1. **One owner per row.** Every fixture record, such as a tenant or an account, belongs to exactly one suite.
2. **A mutated row is the mutating test's alone.** A test that changes fixture data changes only rows declared for that test. No other test reads them.
3. **A mutating test resets before it acts.** Use the reset exported beside the declaration, so a retry starts where the first attempt did.
4. **What no seed can hold, the test creates.** This covers states no UI can reach, and rows for a standing test account. The test deletes them after.
5. **A fixture can break the rule.** Where a test checks a rule over a collection, the declared data includes a member for which the rule's outcome differs.

## What a Spec May Not Fake

No spec intercepts or substitutes the application's own network calls. Do not use `page.route` over the application's API. Do not inject a fake client.

## Queries

Query by role first, then by text, then by test id:

```text
page.getByRole("button", name: "Submit")   // first choice
page.getByText("Saved")                    // second
page.getByTestId("order-row")              // last
```

Project additions: if `.claude/extensions/test-design/writing-e2e-ui-tests.md` exists in the project, read it now and follow it as part of this skill.
