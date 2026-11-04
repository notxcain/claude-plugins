import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const HOOK = join(import.meta.dir, "..", "plugins", "spec-driven", "hooks", "adr-commit-signal.sh");
const SIGNAL_FILE = ".claude/extensions/spec-driven/adr-signal.json";

const repos: string[] = [];
afterEach(() => {
  for (const r of repos.splice(0)) rmSync(r, { recursive: true, force: true });
});

const git = (cwd: string, ...args: string[]) => {
  const r = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
};

const write = (root: string, path: string, content = "x\n") => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
};

// A repo with one commit holding `base`, then `staged` written and staged.
const repo = (base: Record<string, string>, staged: string[]) => {
  const root = mkdtempSync(join(tmpdir(), "adr-signal-"));
  repos.push(root);
  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.email", "t@example.com");
  git(root, "config", "user.name", "t");
  write(root, "README.md");
  for (const [p, c] of Object.entries(base)) write(root, p, c);
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  for (const p of staged) write(root, p, "changed\n");
  git(root, "add", "-A");
  return root;
};

const hook = (root: string, command = 'git commit -m "change"') => {
  const r = Bun.spawnSync(["bash", HOOK], {
    cwd: root,
    env: { PATH: process.env.PATH ?? "", CLAUDE_PROJECT_DIR: root },
    stdin: new TextEncoder().encode(JSON.stringify({ tool_input: { command }, cwd: root })),
    stdout: "pipe",
    stderr: "pipe",
  });
  return { code: r.exitCode, out: r.stdout.toString() };
};

const context = (out: string): string => JSON.parse(out).hookSpecificOutput.additionalContext;

describe("adr commit signal", () => {
  test("should_signal_a_changed_manifest", () => {
    const root = repo({ "package.json": "{}\n" }, ["package.json"]);
    expect(context(hook(root).out)).toContain("dependency manifest changed");
  });

  test("should_name_the_recording_skill_by_its_namespaced_name", () => {
    const root = repo({ "package.json": "{}\n" }, ["package.json"]);
    expect(context(hook(root).out)).toContain("spec-driven:recording-architecture-decisions");
  });

  test("should_signal_an_added_migration_by_default", () => {
    const root = repo({}, ["db/migrations/001.sql"]);
    expect(context(hook(root).out)).toContain("schema migration added");
  });

  test("should_signal_a_migration_at_the_repo_root", () => {
    const root = repo({}, ["migrations/001.sql"]);
    expect(context(hook(root).out)).toContain("schema migration added");
  });

  test("should_signal_a_new_boundary_from_project_globs", () => {
    const signal = JSON.stringify({ boundaries: ["modules/*/*"] });
    const root = repo({ [SIGNAL_FILE]: signal }, ["modules/domains/billing/src/a.ts"]);
    expect(context(hook(root).out)).toContain("new module/service boundary (modules/domains/billing)");
  });

  test("should_not_signal_a_boundary_that_exists_in_head", () => {
    const signal = JSON.stringify({ boundaries: ["modules/*/*"] });
    const root = repo({ [SIGNAL_FILE]: signal, "modules/domains/billing/src/a.ts": "a\n" }, [
      "modules/domains/billing/src/b.ts",
    ]);
    expect(hook(root).out).toBe("");
  });

  test("should_use_project_globs_from_adr_signal_json", () => {
    const signal = JSON.stringify({ manifests: ["**/build.gradle"] });
    const npm = repo({ [SIGNAL_FILE]: signal, "package.json": "{}\n" }, ["package.json"]);
    expect(hook(npm).out).toBe("");
    const gradle = repo({ [SIGNAL_FILE]: signal }, ["app/build.gradle"]);
    expect(context(hook(gradle).out)).toContain("dependency manifest changed");
  });

  test("should_use_defaults_when_adr_signal_json_is_absent", () => {
    const root = repo({}, ["service/build.sbt"]);
    expect(context(hook(root).out)).toContain("dependency manifest changed");
  });

  test("should_print_nothing_when_adr_signal_json_is_malformed", () => {
    const root = repo({ [SIGNAL_FILE]: "{ not json" }, ["package.json"]);
    expect(hook(root)).toEqual({ code: 0, out: "" });
  });

  test("should_stay_silent_when_the_commit_records_an_adr", () => {
    const root = repo({ "package.json": "{}\n" }, ["package.json", "docs/adr/0002-x.md"]);
    expect(hook(root).out).toBe("");
  });

  test("should_ignore_a_command_that_is_not_a_commit", () => {
    const root = repo({ "package.json": "{}\n" }, ["package.json"]);
    expect(hook(root, "git status")).toEqual({ code: 0, out: "" });
  });
});
