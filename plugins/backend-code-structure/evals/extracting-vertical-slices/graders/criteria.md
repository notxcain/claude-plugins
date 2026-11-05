---
type: llm
weight: 2
---
PASS if the result is one query handler with a typed request (not a bare string id), a view type, and a typed not-found error in its return type, and the handler reads the data itself instead of calling OrderService.
FAIL if the handler calls OrderService or another handler, throws an untyped error, or keeps the mailer dependency.
