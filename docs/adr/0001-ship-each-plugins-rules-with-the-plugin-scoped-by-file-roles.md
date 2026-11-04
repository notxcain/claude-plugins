# 0001. Ship each plugin's rules with the plugin, scoped by file roles

Status: Accepted
Date: 2026-11-04

## Context
A plugin skill states rules, such as "inject a fake, never a mock". A rule that no check runs is
a suggestion. The steering engine lists and checks rules, but a plugin cannot know where a
project keeps its tests, its application code or its UI.

## Decision
A plugin ships its own rules, each with its check, inside the plugin. A plugin rule names the
file roles it applies to, never paths. A project that runs the engine maps each role to globs in
its engine config. A plugin rule's id starts with the plugin's name, and the plugin's name is its
group. The engine defines the phases. A project can add phases and groups for its own rules.

A project cannot turn off a plugin rule. It can put a hit in its baseline.

## Rejected alternatives
- The engine runs only project rules. Each project writes its own checks for the plugin skills it
  uses. Rejected because each project then restates the plugin's rules, and the restatements
  drift from the skill and from each other.

## Consequences
- A plugin rule must hold in every codebase that uses the plugin. A rule that a codebase could
  reasonably reject belongs to that codebase.
- The catalogue of a project lists rules that the project's repository does not contain.
- A role is a contract between plugins and projects. Renaming a role breaks every project that
  maps it.

## Revisit when
A project needs to turn off a plugin rule that is still right for the other projects. That needs
an opt-out mechanism, and a decision about which rules may be opted out of.
