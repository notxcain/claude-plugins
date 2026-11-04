import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { checkSkills, GENERAL_PLUGINS } from "../scripts/check-skills";

const fixture = (name: string) => join(import.meta.dir, "fixtures", name);
const problems = (name: string) => checkSkills(fixture(name)).join("\n");

describe("check-skills", () => {
  test("should_pass_when_every_skill_ends_with_its_extension_line", () => {
    expect(checkSkills(fixture("skills-ok"))).toEqual([]);
  });

  test("should_fail_when_the_extension_line_names_another_skill", () => {
    expect(problems("skills-wrong-line")).toContain("skills/a/SKILL.md: last line must be");
  });

  test("should_fail_when_a_general_plugin_has_a_typescript_fence", () => {
    const out = problems("skills-ts-general");
    expect(out).toContain("skills/a/SKILL.md:");
    expect(out).toContain("ts");
  });

  test("should_allow_a_typescript_fence_in_a_stack_plugin", () => {
    expect(checkSkills(fixture("skills-ts-stack"))).toEqual([]);
  });

  test("should_fail_when_a_skill_names_a_project_term", () => {
    expect(problems("skills-term-common")).toContain("@common/");
    expect(problems("skills-term-bun")).toContain("bun run");
  });

  test("should_not_flag_github_as_a_project_term", () => {
    expect(checkSkills(fixture("skills-term-github"))).toEqual([]);
  });

  test("should_exit_1_and_print_one_line_per_problem_from_the_cli", async () => {
    const proc = Bun.spawn(["bun", "scripts/check-skills.ts", fixture("skills-wrong-line")], {
      cwd: join(import.meta.dir, ".."),
      stdout: "pipe",
    });
    const out = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(1);
    expect(out.trim().split("\n")).toHaveLength(1);
  });

  test("should_list_the_general_plugins", () => {
    expect(GENERAL_PLUGINS).toEqual(["spec-driven", "test-design", "backend-code-structure"]);
  });
});
