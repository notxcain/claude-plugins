import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Dependency = { name: string; version: string };
type Manifest = { name?: string; version?: string; dependencies?: Dependency[] };

const readJson = (path: string): Manifest & { plugins?: { name: string; source: string; version?: string }[] } =>
  JSON.parse(readFileSync(path, "utf8"));

/**
 * One version for the marketplace: every plugin.json version and every dependency
 * version equals the tag (or, with no tag, the first plugin's version).
 * Returns one line per mismatch.
 */
export function checkVersions(root: string, tag?: string): string[] {
  const out: string[] = [];
  const marketplacePath = ".claude-plugin/marketplace.json";
  const marketplace = readJson(join(root, marketplacePath));

  const found: { dir: string; manifestPath: string; manifest: Manifest }[] = [];
  for (const entry of marketplace.plugins ?? []) {
    const dir = entry.source.replace(/^\.\//, "");
    const manifestPath = `${dir}/.claude-plugin/plugin.json`;
    if (!existsSync(join(root, manifestPath))) {
      out.push(`${marketplacePath}: entry "${entry.name}" has no ${manifestPath}`);
      continue;
    }
    const manifest = readJson(join(root, manifestPath));
    found.push({ dir, manifestPath, manifest });
    if (entry.version !== undefined && manifest.version !== undefined && entry.version !== manifest.version) {
      out.push(`${marketplacePath}: entry "${entry.name}" version ${entry.version} differs from ${manifestPath} ${manifest.version}`);
    }
  }

  const expected = tag ? tag.replace(/^v/, "") : found.find((f) => f.manifest.version)?.manifest.version;
  if (expected === undefined) return out;
  const source = tag ? `tag ${tag}` : "the first plugin";

  for (const { manifestPath, manifest } of found) {
    if (manifest.version !== expected) {
      out.push(`${manifestPath}: version ${manifest.version ?? "(none)"} differs from ${source} (${expected})`);
    }
    for (const dep of manifest.dependencies ?? []) {
      if (dep.version !== expected) {
        out.push(`${manifestPath}: dependency ${dep.name} version ${dep.version} differs from ${source} (${expected})`);
      }
    }
  }
  return out;
}

const headTag = async (root: string): Promise<string | undefined> => {
  const proc = Bun.spawn(["git", "-C", root, "describe", "--tags", "--exact-match"], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const text = (await new Response(proc.stdout).text()).trim();
  return (await proc.exited) === 0 && text ? text : undefined;
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  const flag = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const root = flag("--root") ?? process.cwd();
  const tag = flag("--tag") ?? (await headTag(root));
  const problems = checkVersions(root, tag);
  for (const p of problems) console.log(p);
  process.exit(problems.length === 0 ? 0 : 1);
}
