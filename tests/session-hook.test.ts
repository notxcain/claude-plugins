import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const fixtures = join(import.meta.dir, "fixtures", "session");
const pluginRoot = join(fixtures, "plugin");

// The command every plugin's hooks.json uses; <p> is the plugin name.
const sessionCommand = (p: string) =>
  `sh -c 'cat "$CLAUDE_PLUGIN_ROOT/session.md" 2>/dev/null; cat "\${CLAUDE_PROJECT_DIR:-.}/.claude/extensions/${p}/session.md" 2>/dev/null; exit 0'`;

const run = async (projectDir: string | undefined) => {
  const env: Record<string, string> = { PATH: process.env.PATH ?? "", CLAUDE_PLUGIN_ROOT: pluginRoot };
  if (projectDir !== undefined) env.CLAUDE_PROJECT_DIR = projectDir;
  const proc = Bun.spawn(["sh", "-c", sessionCommand("demo")], {
    env,
    cwd: join(fixtures, "empty-project"),
    stdout: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  return { out, code: await proc.exited };
};

describe("session hook", () => {
  test("should_print_plugin_text_then_project_text", async () => {
    expect((await run(join(fixtures, "project"))).out).toBe("plugin\nproject\n");
  });

  test("should_print_plugin_text_when_project_has_no_extension", async () => {
    const r = await run(join(fixtures, "empty-project"));
    expect(r).toEqual({ out: "plugin\n", code: 0 });
  });

  test("should_print_plugin_text_when_project_dir_is_unset", async () => {
    const r = await run(undefined);
    expect(r).toEqual({ out: "plugin\n", code: 0 });
  });
});
