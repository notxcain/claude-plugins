# 0002. Run the steering engine on bun

Status: Accepted
Date: 2026-11-04

## Context
The steering engine came from a bun codebase. Its scripts use bun APIs, such as `Bun.Glob`, and
Effect `Schema`. The engine must run in codebases of any stack, on developer machines and on CI
runners.

## Decision
The engine runs on bun. A codebase that uses the engine needs bun on its developer machines and
on its CI runners, whatever its own stack is.

## Rejected alternatives
- Node. It is installed in more places, but the scripts use bun APIs, and a port gives the
  engine's users nothing that they need today.
- Compiled binaries for each platform, built with `bun build --compile`. They need no runtime,
  but every release must build and publish one binary for each platform.

## Consequences
- A Scala, Go or Python codebase installs bun to use the engine. The skills and the extensions
  work without bun.
- The engine can use bun APIs freely.

## Revisit when
A codebase that cannot install bun adopts the engine. Compiled binaries are then the next step:
the engine's code stays, and the release gets a build for each platform.
