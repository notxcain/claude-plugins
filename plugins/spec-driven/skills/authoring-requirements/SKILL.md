---
name: authoring-requirements
description: Guides the user through writing a feature specification whose source of truth is an executable behaviour model. An interview settles the goal and the rules, a bounded model checker finds the edge cases, the user decides each one, and the reviewable spec (rules, examples, decisions) is generated from the model. Use when the user wants to write a spec or PRD, define or document product requirements, spec out a feature, or propose a behavior change to an existing feature — including phrasings like "let's spec out a feature", "I need to write requirements for X", "help me define this feature", "change how X works", "modify the behavior of X", or "alter an existing feature". Also use when product and design explore competing solutions to a feature, when a designer brings a prototype or a design for a feature being specified, to continue a spec from an earlier session, or to run a review quiz on a spec. Do not use for implementation, API, or software-design specifications — interfaces, signatures, contracts — unless product behavior also needs defining; write a software design document for those.
---

# Authoring requirements

The model is the source of truth. Everything a reviewer reads is generated from it. The only prose a person writes is the goal.

The operator is usually a product manager, not an engineer, so the terminal and codebase around you are a misleading signal. They decide behaviour; they never read or write the model. Use product and domain language with them, and keep model code in the files behind the spec.

## Interview rules

- Ask one question at a time, as plain text, and wait for the answer. Never send a numbered batch of questions.
- Write each question as one sentence with no example answers after it, and say what the answer changes about what gets built.
- Before the first question, read what the operator pointed at, and the code and docs it touches. Never ask what they already answer.
- Before each question, search the code for its answer, and write what you searched under the question in the state file. A question the code answers is a baseline fact: state it as fact, never ask it. Check each claim about today's system in the text around the question the same way.
- Open with what the operator brought:
  - A brief or a detailed request: play it back in about 200 words (what they want, for whom, and why) with what you found that bears on it, such as a constraint, a conflict, or a cheaper path. Then ask about the open point whose answer most changes what gets built.
  - No brief: ask one open question about the biggest thing the request leaves unsettled. Their own words carry intent your options cannot.
- Push back on vague answers. "Reduce friction" is not a goal; "time-to-first-value under 3 minutes, from 12 today" is.
- Use `AskUserQuestion` only for closed decisions: approving a playback, or choosing between the options of a finding. Never use it to gather information, because invented options anchor the operator.
- The `AskUserQuestion` dialog hides the text sent before it. Print what the operator decides on inside the dialog: a short playback in the question, a long one, such as a baseline table, in the `preview` of the approving option.
- Where the operator does not know an answer, write `[NEEDS CLARIFICATION: <question>]` and carry it into the open decisions. Never pick a value silently.

## Workflow

1. **Size the work** and say the size in one plain line; the operator can override it.
   - No state that changes, and only one actor: write the rules and examples in chat. No model.
   - Entities move between states, or several actors touch the same thing: follow the full workflow.
   - Several solutions compete, and the choice between them changes the rules: settle the goal (step 2), then follow *Exploring options* before step 6.
   - If the work grows, say so and step up to the full workflow. If it is several independent features, say so, agree an order with the operator, and spec them one at a time.

2. **Settle the goal.** Ask until it is settled: a spec built on the wrong problem invalidates everything under it. Write the problem, the persona, a success measure (an unmeasured baseline is `[NEEDS CLARIFICATION]`, never an estimate), and the scope: what is in, what is out, and what must not change. Ask for anti-goals too: what would make this a failure even if it technically works. Each anti-goal becomes an invariant in the model. This is the only prose section.

3. **Draft the rules and play them back in chunks.** Write each rule as one row, `When <actor> <does>` → `Then <outcome>`, with an ID (R1, R2…). Add invariants: statements that hold in every state. Play the rules back one area at a time, in about 200–300 words, then return to questions. Mark each rule as **you said** or **my guess**. A guess becomes a rule only once the operator confirms it, and approval covers only what you showed them.

4. **Write the model.** First fill the writer inventory and the platform inventory in `baseline.md`, as [references/baseline.md](references/baseline.md) says. Then follow [references/model.md](references/model.md). Every branch cites the rule it encodes. A branch that no rule decides cites `UNDECIDED`, never a guess.

5. **Explore.** Run the checker to a stated bound. Collect invariant breaks, every `UNDECIDED` branch it reaches, and every case where two rules conflict. Keep the shortest trace to each.

6. **Sort the findings into three piles:**
   - **Settled:** an existing rule decides it, and the outcome is unsurprising. It becomes an example.
   - **My call:** a sensible builder would decide it the same way, and the choice doesn't change what gets built. Decide it, and record it under *My calls* with a one-line reason. A choice a user would notice, such as what is refused or what they see, is never a call: it is theirs.
   - **Theirs:** only the operator can decide it, and the answer changes what gets built. It becomes a question.

7. **Ask the "theirs" pile**, most important first. Write each question as numbered steps a person can follow, then "what should happen?", then options that always include "something else". Check each option against the platform inventory: drop an option no mechanism can hold, or name the platform change it needs. Get the operator's answer *before* you show your proposal. Each answer becomes a rule, or a decision (D1, D2…) with a one-line reason, and the finding's trace becomes a scenario.

8. **Re-run the checker** after every change to the model. Stop when it reaches no `UNDECIDED` branch within the bound.

9. **Generate the examples** by running the model on concrete scenarios, and render them as [references/spec-template.md](references/spec-template.md) says under *Writing the examples*. Never hand-write an outcome.

10. **Assemble the spec** with [references/spec-template.md](references/spec-template.md). Its status line says which of the rules, the copy and the design are locked, so engineering can start on locked rules while the copy is open. Tell the operator that a reviewer reads it first, and that you may come back once with a few questions.

11. **Run the builder check.** Dispatch a fresh subagent with [references/builder-check.md](references/builder-check.md). Without a subagent tool, read the spec as that builder yourself. A question the conversation already answered means the spec dropped that answer: write it into the spec. Sort the other questions into the "my call" and "theirs" piles of step 6, and bring the "theirs" pile to the operator in a single message. This is the only round of questions the check produces.

12. **Run the review quiz** with the operator, following *Review quiz*.

13. **Run the quality gate**, write the files, and hand the spec over with the list of *My calls*, so the operator can veto any of them.

## Exploring options

- Name each serious option, and link its design: a prototype in the repo, or a design file. Its rules stay in product words; the design carries the UI.
- Do steps 3–5 for each option. Keep each option's rules, model and findings apart.
- Compare the options by what the checker found, by the open decisions each one leaves, and by the research the operator has. Let the operator choose with `AskUserQuestion`.
- Continue from step 6 with the chosen option. Record each rejected option as a decision, with the reason it lost.

## Working across sessions

- Keep a state file next to the spec: the goal, each option and its status, the open findings, and each open question under the person it waits on, such as the operator, the designer, research or engineering.
- Start each session by reading the state file. Ask what changed since, then re-run the checker.
- Write a question for a person who is not in the session into the state file, and go on with the work that does not depend on the answer.
- Update the state file after each answer, finding or decision.

## Working with a designer

The operator and the designer both decide behaviour. The operator decides what makes the feature worth building and allowed: the goal, the scope, and the business and domain rules. The designer decides what makes it usable: the flow, the order of steps, what is shown, and how a user recovers. A designer can run this skill too.

- Give the designer each example and each open finding as a state they can open in the prototype. Build the state's data from the scenarios file; never invent it.
- When a design changes, read the prototype's code, its fake data and the behaviour its fakes encode. List each behaviour that no rule states, such as what is refused, what is shown and what is kept. Each one becomes a rule or a decision, recorded with who made it. Bring one that conflicts with the goal, the scope or an anti-goal to the operator.
- For a design that is not in code, ask the designer to describe its behaviour, and treat the description the same way.

## Review quiz

Run it with any reviewer: the operator in the session, or anyone who opens a session on the spec.

- State the setup the examples share once, before the first example.
- Give each example every input that changes its outcome, such as the language of a question, or say that the input does not matter.
- Name in each question what to predict, such as "which documents can search use" or "what does the staff member see". Score only what the question asked.
- Run it in one of two modes, and switch whenever the reviewer asks:
  - **Predict**, the default for a reviewer who did not decide the rules: show the situation and the action, one example per message, let the reviewer write what they expect, then show the outcome.
  - **Confirm**: show the outcome, and the reviewer replies yes, no or a note. Several outcomes can go under one question. It is faster, but it catches only wrong outcomes, not rules that read unclear. Offer it when the reviewer tires.
- When a prediction fits more than one outcome, ask the clarifying question before you show the outcome. Asked after, it lets the reviewer agree with what they just read.
- On a miss, ask whether the outcome is wrong or the reviewer did not see it. A consequence the spec states and the reviewer did not see is not a finding. A wrong outcome, or a rule that reads unclear, is a finding: take it through steps 6–8, and never just reword the example.
- Label an outcome that comes from a rule the model does not cover; never present it as a model result.
- A prediction about a dimension the model leaves out, such as indexing time, is a finding that extends the model. Re-run the checker after the change.
- Keep a quiz log beside the state file: for each example, the mode, the prediction, the result, and the finding or "forgot". Carry each finding into the state file.

## When review comes back

Run the review quiz with the reviewer. A reviewer who read without an agent leaves the places where their prediction differed from an outcome in a review comment: ask about each one as the quiz asks about a miss.

## Changing an existing feature

This applies to every subsystem the feature reads or changes, not only to the feature itself.

- Read the current behaviour from the code and its tests, not from memory. Model it first as the baseline. Before you specify anything new, show it to the operator as fact, never as a request to confirm it: ask which behaviour differs from what they expect, and say that each difference can become part of the spec. A difference is a finding, a defect in the code or a gap in the operator's picture of the product; the code stays the baseline. Without access to the code, label the baseline as user-provided and unverified.
- Number each existing behaviour (B1, B2…) and state it in the spec in product words, as verified or unverified. Its evidence goes in `baseline.md` beside the model, following [references/baseline.md](references/baseline.md); a baseline branch cites `BASELINE B7`, never a path. Each behaviour, or part of one, that no test observes gets a characterization test before the build starts.
- For a subsystem another team owns, ground the baseline in their e2e tests and their contract, as [references/baseline.md](references/baseline.md) says.
- Model only transitions the code allows. An action with no code path behind it is either a new rule or a `HYPOTHETICAL`, never baseline.
- List every writer of the state the feature reads in the writer inventory: handlers, background jobs such as indexers, extractors and schedulers, admin tools, and other domains' adapters. Each row is an action in the model, or is out of scope with the reason. The checker cannot interleave an actor it does not know.
- Model behaviour the code has but no spec states as `UNDECIDED`. List it as an open decision for the operator to ratify; never record it as decided.
- In the scope, name what must not change in every area the change touches. "Not building X" and "X must keep working" are different statements, and only the second protects existing behaviour. Each item becomes an invariant or a transition check in the model, and a regression test in the code.

## Modelling rules that find real defects

- Model at least two actors per role. Most findings are two people acting on the same thing.
- Model each confirmation the user sees as two actions, *show* and then *confirm*, with other actors free to act in between. A count or preview shown in a dialog can be stale by the time it is confirmed.
- Model undo as an action of its own that captures state when it is offered. That makes "undo after someone else's change" and "undo after the old value was deleted" reachable.
- Seed actions from these edge-case dimensions: zero state, duplicates (an actor brings in something that already exists: the same file, the same name, the same request twice), failure, the boundary at a limit, concurrency, missing permission, and recovery.
- To reach a branch the code handles but no real path seems to take, add an action flagged `HYPOTHETICAL`. Report what it reaches as "if reachable", and ask engineering whether any path can reach it.

## Keeping rules free of design and implementation

- **Not UI:** no gestures, screens, widgets or layout. Write "when the admin requests removal", not "when the admin clicks the trash icon". Where the interaction is itself the product decision, such as undo being available after the fact, state the behaviour it guarantees.
- **Not implementation:** no tables, endpoints, status codes, libraries or services. A binding technical constraint goes in the non-functional table.
- **Non-functional requirements** are a table of thresholds: "p95 under 300 ms for up to 10,000 items", never "fast". Include only the dimensions this change affects. An unknown threshold is `[NEEDS CLARIFICATION]`; never invent a number.

## Quality gate

```
- [ ] Goal: one problem, one persona, a measurable target; scope names what must not change; each anti-goal is an invariant
- [ ] Every rule was confirmed by the operator; none is still marked "my guess"
- [ ] Every rule is cited by at least one model branch; every branch cites a rule, a decision, a BASELINE number, or UNDECIDED
- [ ] Every B, and every must-not-change item, has an entry in baseline.md, and the spec carries no code paths, line numbers or test names
- [ ] The writer inventory in baseline.md has a row for each writer of the state the feature reads, one per transaction, and each row is modelled as an action or is out of scope with a reason
- [ ] The platform inventory in baseline.md has a row for each mechanism the feature builds on, and no model state or question option needs what a mechanism cannot express, unless it names the platform change
- [ ] Each question asked has, in the state file, what was searched in the code before it was asked
- [ ] No UNDECIDED branch is reachable within the bound, unless it is listed as an open decision
- [ ] Each of your choices is listed under My calls or marked as a proposal; only the operator's answers are recorded as decisions
- [ ] Every example outcome came from a model run, and reads as a change in product words: no model identifiers, no notation, no unaffected people
- [ ] The builder check ran, and its "theirs" pile is answered or listed as open
- [ ] The review quiz ran, its log sits beside the state file, and each finding is in the state file
- [ ] Each rejected option is a decision, with the reason it lost
- [ ] Each capability that a decision's reason names (find, detect, check, prevent) has a rule that says what happens when it fires
- [ ] Where there is a prototype, each example has a state in it, built from the scenarios file, and each behaviour the prototype shows is a rule, a decision or a call
- [ ] The status line says which of the rules, the copy and the design are locked
- [ ] The bound, and what the model does not cover, sit next to every claim that nothing broke
- [ ] Rules carry no UI design and no implementation; every non-functional threshold is a number or NEEDS CLARIFICATION
```

## Output

Write the files where the project keeps change scaffolding. Absent a convention, use `docs/plans/`:
- `YYYY-MM-DD-<feature>-requirements.md`, the reviewable spec
- the model, the checker and the checker's report
- the scenarios, as data (YAML or JSON)
- `baseline.md`, the evidence for each existing behaviour, the writer inventory and the platform inventory
- the state file, which carries the work between sessions

Where the project deletes this scaffolding when the change ships, nothing that survives the merge may depend on an R, D or Q ID.

## Handing the model to implementations

The contract with the code is the trace format, not the language the model is written in. Export traces as JSON (ITF, the Informal Trace Format, where the tooling supports it), so that each implementation replays them through a thin adapter in its own language. When a rule spans subsystems, name the subsystem that owns it, and include at least one trace that crosses the boundary.

Project additions: if `.claude/extensions/spec-driven/authoring-requirements.md` exists in the project, read it now and follow it as part of this skill.
