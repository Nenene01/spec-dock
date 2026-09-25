import test from "node:test";
import assert from "node:assert/strict";
import { diagnostics } from "../../packages/core/src/diagnostics.mjs";

function model(overrides = {}) {
  return {
    config: { api: { mode: "code-first" }, file: "spec-dock.config.json" },
    prisma: { files: [], models: [] },
    openapi: { files: ["openapi.yaml"], operations: [{ schema: "OrderResponse", file: "openapi.yaml" }] },
    zod: { files: ["src/schemas/order.ts"], schemas: [{ name: "OrderResponse", file: "src/schemas/order.ts" }, { name: "Unused", file: "src/schemas/unused.ts" }] },
    markdown: { files: ["docs/orders.md"], documents: [{ file: "docs/orders.md", links: ["../openapi.yaml", "missing.md"] }] },
    ...overrides,
  };
}

test("diagnostics reports unused Zod schemas", () => {
  const items = diagnostics(model());
  assert.equal(items.find((item) => item.code === "W002")?.source, "src/schemas/unused.ts");
});

test("diagnostics reports missing local Markdown links", () => {
  const items = diagnostics(model());
  assert.deepEqual(items.filter((item) => item.code === "W003"), [{ code: "W003", level: "warning", message: "文書リンクの参照先が見つかりません: missing.md", source: "docs/orders.md" }]);
});
