import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { checkVersions } from "../scripts/check-versions";

const fixture = (name: string) => join(import.meta.dir, "fixtures", name);

describe("check-versions", () => {
  test("should_pass_when_all_versions_equal_the_tag", () => {
    expect(checkVersions(fixture("versions-ok"), "v0.1.0")).toEqual([]);
  });

  test("should_fail_when_a_plugin_version_differs_from_the_tag", () => {
    const out = checkVersions(fixture("versions-ok"), "v0.2.0").join("\n");
    expect(out).toContain("plugins/p/.claude-plugin/plugin.json");
    expect(out).toContain("0.2.0");
  });

  test("should_fail_when_a_dependency_version_differs", () => {
    const out = checkVersions(fixture("versions-bad-dep")).join("\n");
    expect(out).toContain("plugins/q/.claude-plugin/plugin.json");
    expect(out).toContain("dependency p");
  });

  test("should_fail_when_a_marketplace_entry_has_no_plugin_dir", () => {
    const out = checkVersions(fixture("versions-no-dir")).join("\n");
    expect(out).toContain("marketplace.json");
    expect(out).toContain("plugins/q");
  });
});
