# test-design

Two skills on how to design tests.

- `test-design:designing-tests` — test sizes (Small, Medium, Large), the doubles hierarchy, state over behavior, SPI suites for fakes, hermetic tests.
- `test-design:writing-e2e-ui-tests` — Playwright end-to-end UI tests: suite ownership, fixture rules, authentication, what a spec may not fake, query priority.

## Install

```
/plugin install test-design@notxcain
```

## Example notation

Examples in `designing-tests` use typed pseudocode in `text` fences. A step that a library does is a verb. `writing-e2e-ui-tests` uses Playwright words, which are the same in TS, Python, Java and .NET. A stack plugin repeats the main examples in its own idioms.

## Extensions

A project adds to a skill with `.claude/extensions/test-design/<skill>.md`. A project adds session text with `.claude/extensions/test-design/session.md`. An extension only adds.
