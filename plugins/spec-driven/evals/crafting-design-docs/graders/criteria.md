---
type: llm
weight: 2
---
PASS if the document gives method or route signatures whose return types include the error cases (for example an expired or used token), defines those error types, and states the token's state transitions.
FAIL if the document contains handler or method bodies, query implementations, or omits the error types.
