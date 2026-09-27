import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSplitRatio, splitGridColumns, splitRatioFromPointer } from "../packages/studio/client/split-layout.mjs";

test("split divider tracks the pointer and keeps both panes visible", () => {
  const bounds = { left: 100, width: 1000 };
  assert.equal(splitRatioFromPointer(400, bounds), 30);
  assert.equal(splitRatioFromPointer(100, bounds), 20);
  assert.equal(splitRatioFromPointer(1100, bounds), 80);
  assert.equal(splitRatioFromPointer(400, { left: 0, width: 0 }), 50);
  assert.equal(normalizeSplitRatio("invalid"), 50);
  assert.equal(normalizeSplitRatio(null), 50);
  assert.equal(splitGridColumns(30), "minmax(0, 30fr) 6px minmax(0, 70fr)");
});
