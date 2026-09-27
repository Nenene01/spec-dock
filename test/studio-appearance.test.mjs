import assert from "node:assert/strict";
import test from "node:test";
import { appearanceStorageKey, appearanceStyles, defaultAppearance, loadAppearance, normalizeAppearance, preferredFontStack, saveAppearance } from "../packages/studio/client/appearance.mjs";

test("appearance settings reject unknown values and keep defaults", () => {
  assert.deepEqual(normalizeAppearance({ theme: "invalid", fontFamily: "", fontSize: 100 }), defaultAppearance);
  assert.deepEqual(normalizeAppearance(null), defaultAppearance);
  assert.equal(defaultAppearance.fontFamily, preferredFontStack);
  assert.equal(normalizeAppearance({ fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif' }).fontFamily, preferredFontStack);
  assert.equal(normalizeAppearance({ fontFamily: 'Menlo, "Hack Nerd Font", Monaco, "Courier New", monospace' }).fontFamily, preferredFontStack);
  assert.match(preferredFontStack, /Monaco, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo/);
});

test("appearance settings change the dark palette and font", () => {
  const styles = appearanceStyles({ theme: "monokai", fontFamily: "Menlo, monospace", fontSize: 16 });
  assert.equal(styles["--studio-bg"], "#1d1e19");
  assert.equal(styles["--studio-accent"], "#a6e22e");
  assert.equal(styles["--studio-scale"], 16 / 14);
  assert.equal(styles["--studio-font"], "Menlo, monospace");
});

test("appearance settings persist and migrate earlier preferences", () => {
  const values = new Map([["specdock:appearance:v1", JSON.stringify({ color: "amber", font: "mono", size: 16 })]]);
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  assert.equal(loadAppearance(storage).theme, "monokai");
  saveAppearance(storage, { theme: "abyss", fontFamily: "Menlo, monospace", fontSize: 12 });
  assert.ok(values.has(appearanceStorageKey));
  assert.deepEqual(loadAppearance(storage), { theme: "abyss", fontFamily: "Menlo, monospace", fontSize: 12 });
  values.set(appearanceStorageKey, "not json");
  assert.deepEqual(loadAppearance(storage), defaultAppearance);
});
