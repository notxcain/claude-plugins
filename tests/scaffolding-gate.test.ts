import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const GATE = join(import.meta.dir, "..", "plugins", "spec-driven", "bin", "scaffolding-gate.sh");

const repos: string[] = [];
afterEach(() => {
  for (const r of repos.splice(0)) rmSync(r, { recursive: true, force: true });
});

const git = (cwd: string, ...args: string[]) => {
  const r = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  return r.stdout.toString().trim();
};

const write = (root: string, path: string, content: string) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
};

// A repo with one base commit; returns the repo path and the base sha.
const repo = (files: Record<string, string> = {}) => {
  const root = mkdtempSync(join(tmpdir(), "gate-"));
  repos.push(root);
  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.email", "t@example.com");
  git(root, "config", "user.name", "t");
  write(root, "README.md", "x\n");
  for (const [p, c] of Object.entries(files)) write(root, p, c);
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  return { root, base: git(root, "rev-parse", "HEAD") };
};

const commit = (root: string) => {
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "change");
};

const gate = (root: string, ...args: string[]) => {
  const r = Bun.spawnSync(["bash", GATE, ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
};

const ADR = "# 0001. A decision\n\nStatus: Accepted\nDate: 2026-01-01\n\n## Decision\nX.\n";

describe("scaffolding gate", () => {
  test("should_exit_0_when_nothing_is_tracked_under_scaffolding", () => {
    const { root, base } = repo({ "docs/adr/0001-a.md": ADR });
    expect(gate(root, "--base", base, "--adr-dir", "docs/adr", "--scaffolding", "docs/plans").code).toBe(0);
  });

  test("should_report_each_tracked_scaffolding_file", () => {
    const { root, base } = repo();
    write(root, "docs/plans/x-design.md", "d\n");
    commit(root);
    const r = gate(root, "--base", base, "--adr-dir", "docs/adr", "--scaffolding", "docs/plans");
    expect(r.code).toBe(1);
    expect(r.out).toContain("docs/plans/x-design.md");
  });

  test("should_report_a_deleted_adr", () => {
    const { root, base } = repo({ "docs/adr/0001-a.md": ADR });
    git(root, "rm", "-q", "docs/adr/0001-a.md");
    commit(root);
    const r = gate(root, "--base", base, "--adr-dir", "docs/adr");
    expect(r.code).toBe(1);
    expect(r.out).toContain("docs/adr/0001-a.md: An ADR is never deleted or renamed");
  });

  test("should_report_a_renamed_adr", () => {
    const { root, base } = repo({ "docs/adr/0001-a.md": ADR });
    git(root, "mv", "docs/adr/0001-a.md", "docs/adr/0001-b.md");
    commit(root);
    const r = gate(root, "--base", base, "--adr-dir", "docs/adr");
    expect(r.code).toBe(1);
    expect(r.out).toContain("An ADR is never deleted or renamed");
  });

  test("should_allow_a_status_line_edit", () => {
    const { root, base } = repo({ "docs/adr/0001-a.md": ADR });
    write(root, "docs/adr/0001-a.md", ADR.replace("Status: Accepted", "Status: Superseded by 0002"));
    commit(root);
    expect(gate(root, "--base", base, "--adr-dir", "docs/adr").code).toBe(0);
  });

  test("should_report_any_other_adr_edit", () => {
    const { root, base } = repo({ "docs/adr/0001-a.md": ADR });
    write(root, "docs/adr/0001-a.md", ADR.replace("X.", "Y."));
    commit(root);
    const r = gate(root, "--base", base, "--adr-dir", "docs/adr");
    expect(r.code).toBe(1);
    expect(r.out).toContain("docs/adr/0001-a.md: Only the Status line of an existing ADR may change");
  });

  test("should_report_an_adr_that_names_a_scaffolding_path", () => {
    const { root, base } = repo();
    write(root, "docs/adr/0002-b.md", `${ADR}See docs/plans/2026-01-01-x-design.md.\n`);
    commit(root);
    const r = gate(root, "--base", base, "--adr-dir", "docs/adr", "--scaffolding", "docs/plans");
    expect(r.code).toBe(1);
    expect(r.out).toContain("docs/adr/0002-b.md: An ADR points at change scaffolding");
  });

  test("should_exit_2_when_the_base_ref_does_not_exist", () => {
    const { root } = repo();
    expect(gate(root, "--base", "no-such-ref", "--adr-dir", "docs/adr").code).toBe(2);
  });

  test("should_exit_2_without_a_base", () => {
    const { root } = repo();
    expect(gate(root, "--adr-dir", "docs/adr").code).toBe(2);
  });

  test("should_report_a_scaffolding_file_whose_name_has_a_space", () => {
    const { root, base } = repo();
    write(root, "docs/plans/my design.md", "d\n");
    commit(root);
    const r = gate(root, "--base", base, "--adr-dir", "docs/adr", "--scaffolding", "docs/plans");
    expect(r.code).toBe(1);
    expect(r.out).toContain("docs/plans/my design.md");
  });

  test("should_exit_0_when_the_adr_dir_does_not_exist", () => {
    const { root, base } = repo();
    expect(gate(root, "--base", base, "--adr-dir", "docs/adr").code).toBe(0);
  });

  test("should_print_github_annotations_with_format_github", () => {
    const { root, base } = repo();
    write(root, "docs/plans/x-design.md", "d\n");
    commit(root);
    const r = gate(root, "--base", base, "--adr-dir", "docs/adr", "--scaffolding", "docs/plans", "--format", "github");
    expect(r.out.split("\n").some((l) => l.startsWith("::error file=docs/plans/x-design.md::"))).toBe(true);
  });

  test("should_run_only_one_group_with_only", () => {
    const { root, base } = repo({ "docs/adr/0001-a.md": ADR });
    git(root, "rm", "-q", "docs/adr/0001-a.md");
    write(root, "docs/plans/x-design.md", "d\n");
    commit(root);
    const adrOnly = gate(root, "--base", base, "--adr-dir", "docs/adr", "--scaffolding", "docs/plans", "--only", "adr");
    expect(adrOnly.out).toContain("0001-a.md");
    expect(adrOnly.out).not.toContain("x-design.md");
    const scaffoldingOnly = gate(
      root, "--base", base, "--adr-dir", "docs/adr", "--scaffolding", "docs/plans", "--only", "scaffolding",
    );
    expect(scaffoldingOnly.out).toContain("x-design.md");
    expect(scaffoldingOnly.out).not.toContain("0001-a.md");
  });
});
