---
name: crafting-design-docs
description: Use when writing, extending, or reviewing a software design document (design.md) — the HOW of a feature: interfaces, method signatures, error types, SPI contracts, API route contracts, component props, state transitions and invariants. Distinct from spec-driven:authoring-requirements, which covers the WHAT (requirements and behaviour). Also use when judging whether a design doc is complete enough to plan from.
---

# Crafting design documents

- **Focus on contracts, not implementation**: design.md defines interfaces and contracts with the outside world, not how things work internally.
- **Include**:
  - Method signatures with return types that include the error type
  - Error type definitions
  - SPI interfaces (e.g., AuthorizationService, not direct cross-domain repository usage)
  - API route contracts (HTTP methods, paths, status codes)
  - Component prop interfaces
  - Key behavioral descriptions (what each method does, one line per method)
  - State transition rules and invariants
  - Existing code the design follows, by path, and why
  - Libraries: for each part that is not specific to this codebase (a protocol, a file format, auth, parsing, retries), the maintained OSS library that does it, what it does and what we still write, checked against its published package, not from memory; each library considered and not chosen, and why. A part we write ourselves names the libraries checked
  - The scenario adapter: for each action in the spec's scenarios file, the handler or route that performs it; for each view the scenarios expect, the query that reads it
  - The screens and dialogs where the spec's outcomes show
- **Exclude**:
  - Implementation code (no handler bodies, no service method bodies)
  - Algorithm implementations (unless complex/non-obvious)
  - Repository query implementations
  - Component implementation details
  - Hook implementations (only interfaces)

Project additions: if `.claude/extensions/spec-driven/crafting-design-docs.md` exists in the project, read it now and follow it as part of this skill.
