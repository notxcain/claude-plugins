# claude-plugins

```
/plugin marketplace add notxcain/claude-plugins
/plugin install working-agreement@notxcain
```

## Plugins

- `working-agreement` — injects `plugins/working-agreement/rules.md` at session start.

More plugins (`spec-driven`, `test-design`, `backend-code-structure`, `typescript-effect`) arrive in later releases.

## Versions

There is one version for the whole marketplace. A release is a git tag `vX.Y.Z`. Every `plugin.json` `version` equals the tag, and every `dependencies` entry names a plugin at that same version. `bun scripts/check-versions.ts [--tag vX.Y.Z]` checks this. CI runs it, and it uses the tag on `HEAD` when there is one.

## Extension contract

A project adds to a plugin with files at fixed paths. Every path is optional.

| Path | Read by | When |
|---|---|---|
| `.claude/extensions/<plugin>/<skill>.md` | The agent, by the skill's last line | When the skill loads |
| `.claude/extensions/<plugin>/session.md` | The plugin's SessionStart hook, which prints it after the plugin's session text | Every session |

The last line of every plugin `SKILL.md`, verbatim except for the two names:

```
Project additions: if `.claude/extensions/<plugin>/<skill>.md` exists in the project, read it now and follow it as part of this skill.
```

Rules for an extension:

- It adds steps, paths, commands, examples and rules. It never says "ignore", "instead of" or "does not apply" about plugin text. A project that needs that has found a contested opinion in a plugin, and the fix goes into the plugin.
- It references the plugin skill by its namespaced name.

An agent can skip the read of a skill extension. The session extension has no such limit, because a hook prints it.

The SessionStart command of every plugin is the same, with `<p>` the plugin name. It prints the plugin text, then the project text, and always exits 0:

```
sh -c 'cat "$CLAUDE_PLUGIN_ROOT/session.md" 2>/dev/null; cat "${CLAUDE_PROJECT_DIR:-.}/.claude/extensions/<p>/session.md" 2>/dev/null; exit 0'
```

## Example notation (general plugins)

The general plugins (`spec-driven`, `test-design`, `backend-code-structure`) hold no `ts`, `tsx`, `typescript`, `scala` or `python` code fence. Every example uses this typed pseudocode, in a `text` fence:

```text
handler GetOrder(db: Database)
  handle(query: GetOrderQuery) -> OrderView | OrderNotFound
    row = db.find(order, query.orderId)
    if none(row): fail OrderNotFound(query.orderId)
    return view(row)
```

- Types, the error union, and dependencies (as constructor parameters) are always written.
- `fail E` ends the handler with error `E`. `-> A | E1 | E2` is success `A` or one of the errors.
- No library call appears. A step that a library does is a verb: `db.find`, `http.post`, `span "orders/get"`.
- `test-design:writing-e2e-ui-tests` uses Playwright words (`getByRole`, `route`, `test.describe`), because Playwright has the same API in TS, Python, Java and .NET.
- A stack plugin repeats the main examples in its own idioms.

## Checks

- `bun test` runs the tests of the checks below.
- `bun scripts/check-skills.ts [root]` checks each `SKILL.md` and `references/*.md`: the last line, no stack code fence in a general plugin, and no project term (BrandHub, `hub`, `backoffice`, `@common/`, `@util/`, `@domains/`, `@apps/`, `modules/`, `bun run`). It prints one `path: problem` line per problem and exits 1 on any.
- `claude plugin validate` runs in CI for the marketplace and for each plugin. It needs no login.
- Evals (`claude plugin eval plugins/<p>`, cases in `plugins/<p>/evals/`) run in CI for a changed plugin, when the repository has the `ANTHROPIC_API_KEY` secret.
