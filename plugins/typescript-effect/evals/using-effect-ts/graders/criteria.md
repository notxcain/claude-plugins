---
type: llm
weight: 2
---
PASS if the handler returns an Effect whose error type is a method-specific union of Data.TaggedError classes (for example a not-found error and a duplicate-name error), builds its body with Effect.gen or Effect.fn, and fails with Effect.fail rather than throwing.
FAIL if the handler throws, returns a Promise, or uses a generic Error type in its error channel.
