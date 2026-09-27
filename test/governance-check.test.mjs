import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkGovernance, required } from "../scripts/governance-check.mjs";

test("governance check finds missing files and broken relative links", () => {
  const root = mkdtempSync(join(tmpdir(), "specdock-governance-test-"));
  try {
    for (const file of required) {
      const target = join(root, file);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, "# Example\n");
    }
    writeFileSync(join(root, "README.md"), "[Spec](specs/README.md) [web](https://example.com) `[example](missing.md)`\n");
    assert.deepEqual(checkGovernance(root), []);
    writeFileSync(join(root, "README.md"), "[missing](missing.md)\n");
    assert.deepEqual(checkGovernance(root), ["README.md: リンク先がありません missing.md"]);
    rmSync(join(root, "rules/README.md"));
    assert.ok(checkGovernance(root).some((problem) => problem === "必須ファイルがありません: rules/README.md"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
