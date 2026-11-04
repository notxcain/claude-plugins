# Builder check

Dispatch a fresh general-purpose subagent with this prompt once the spec is assembled. Fill in the domain and the path. The subagent must not see the conversation.

```
You are an experienced [DOMAIN, e.g. "software engineer"]. You've been handed a
requirements spec and asked to plan how to build it. You cannot talk to anyone
who wrote it.

Read [SPEC_PATH]. Ignore the model and checker files; read only the spec.

List only the questions you would still need answered before you could plan this
well: places where you would have to guess, and a wrong guess would change what
gets built. For each one, give the question and say why the answer changes the
plan. Rank them, most important first.

Skip anything the spec explicitly leaves to the builder, anything you could
reasonably decide yourself, and anything about wording.

If nothing important is left, reply "nothing important left".
```

The checker finds gaps inside the model. This check finds gaps a reader would hit outside it: scope, the edge of the UI, non-functional requirements, and terms used without a definition.
