import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const HOOK = join(import.meta.dir, "..", "plugins", "spec-driven", "hooks", "adr-brainstorm-prime.sh");

const hook = (skill: string) => {
  const r = Bun.spawnSync(["bash", HOOK], {
    env: { PATH: process.env.PATH ?? "" },
    stdin: new TextEncoder().encode(JSON.stringify({ tool_input: { skill } })),
    stdout: "pipe",
  });
  return { code: r.exitCode, out: r.stdout.toString() };
};

describe("adr brainstorm prime", () => {
  test("should_emit_context_for_spec_driven_crafting_design_docs", () => {
    const out = JSON.parse(hook("spec-driven:crafting-design-docs").out);
    expect(out.hookSpecificOutput.hookEventName).toBe("PostToolUse");
    expect(out.hookSpecificOutput.additionalContext).toContain("ADR-candidates review");
  });

  test("should_emit_context_for_superpowers_brainstorming", () => {
    expect(JSON.parse(hook("superpowers:brainstorming").out).hookSpecificOutput.additionalContext).toContain(
      "spec-driven:recording-architecture-decisions",
    );
  });

  test("should_emit_nothing_for_another_skill", () => {
    expect(hook("test-design:designing-tests")).toEqual({ code: 0, out: "" });
  });
});
