import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export const GENERAL_PLUGINS = ["spec-driven", "test-design", "backend-code-structure"];

const FORBIDDEN_FENCE = /^\s*```(ts|tsx|typescript|scala|python)\b/im;

// Project-specific terms. Word boundaries keep "GitHub" valid.
const PROJECT_TERMS: [string, RegExp][] = [
  ["BrandHub", /\bbrandhub\b/i],
  ["hub", /\bhub\b/i],
  ["backoffice", /\bbackoffice\b/i],
  ["@common/", /@common\//],
  ["@util/", /@util\//],
  ["@domains/", /@domains\//],
  ["@apps/", /@apps\//],
  ["modules/", /\bmodules\//],
  ["bun run", /\bbun run\b/],
];

const extensionLine = (plugin: string, skill: string) =>
  `Project additions: if \`.claude/extensions/${plugin}/${skill}.md\` exists in the project, read it now and follow it as part of this skill.`;

const dirs = (path: string) =>
  existsSync(path)
    ? readdirSync(path, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
    : [];

const markdownFiles = (path: string): string[] =>
  existsSync(path)
    ? readdirSync(path, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => join(path, e.name))
        .sort()
    : [];

/** Returns one `path: problem` line per problem. Paths are relative to `root`. */
export function checkSkills(root: string): string[] {
  const out: string[] = [];
  for (const plugin of dirs(join(root, "plugins"))) {
    for (const skill of dirs(join(root, "plugins", plugin, "skills"))) {
      const skillDir = join(root, "plugins", plugin, "skills", skill);
      const skillFile = join(skillDir, "SKILL.md");
      const rel = (f: string) => relative(join(root, "plugins", plugin), f);

      if (existsSync(skillFile)) {
        const lines = readFileSync(skillFile, "utf8").trimEnd().split("\n");
        const expected = extensionLine(plugin, skill);
        if (lines[lines.length - 1] !== expected) {
          out.push(`${rel(skillFile)}: last line must be: ${expected}`);
        }
      } else {
        out.push(`${rel(skillFile)}: missing SKILL.md`);
      }

      const files = [...(existsSync(skillFile) ? [skillFile] : []), ...markdownFiles(join(skillDir, "references"))];
      for (const file of files) {
        const text = readFileSync(file, "utf8");
        if (GENERAL_PLUGINS.includes(plugin)) {
          const fence = FORBIDDEN_FENCE.exec(text);
          if (fence) out.push(`${rel(file)}: code fence "${fence[1]}" is not allowed in a general plugin; use text`);
        }
        for (const [name, re] of PROJECT_TERMS) {
          if (re.test(text)) out.push(`${rel(file)}: names the project term "${name}"`);
        }
      }
    }
  }
  return out;
}

if (import.meta.main) {
  const root = process.argv[2] ?? process.cwd();
  const problems = checkSkills(root);
  for (const p of problems) console.log(p);
  process.exit(problems.length === 0 ? 0 : 1);
}
