import assert from "node:assert/strict";
import test from "node:test";
import { buildExplorerGroups, filterExplorerGroups, hasExplorerSearchTerms, isExplorerSearchShortcut } from "../packages/studio/client/explorer-search.mjs";

const model = {
  markdown: { documents: [{ title: "注文作成", summary: "新しい注文", file: "specs/order.md", body: "顧客IDを指定して保存" }] },
  openapi: { operations: [{ method: "POST", path: "/orders", summary: "注文を登録", parameters: [{ name: "customerId" }] }] },
  prisma: { models: [{ name: "Order", fields: [{ name: "createdAt" }] }] },
  zod: { schemas: [{ name: "OrderInput", fields: [{ name: "quantity" }] }] },
};

test("Explorer searches document bodies, API details, and model fields", () => {
  const groups = buildExplorerGroups(model);
  assert.deepEqual(filterExplorerGroups(groups, "顧客ID").map((group) => group.items[0].href), ["document/0"]);
  assert.deepEqual(filterExplorerGroups(groups, "post /orders").map((group) => group.items[0].href), ["api/0"]);
  assert.deepEqual(filterExplorerGroups(groups, "customerId").map((group) => group.items[0].href), ["api/0"]);
  assert.deepEqual(filterExplorerGroups(groups, "createdAt").map((group) => group.items[0].href), ["database/0"]);
  assert.deepEqual(filterExplorerGroups(groups, "quantity").map((group) => group.items[0].href), ["zod/0"]);
  assert.equal(filterExplorerGroups(groups, "ない項目").length, 0);
  assert.equal(filterExplorerGroups(groups, " ").length, 5);
});

test("comma-separated conditions match any group; spaces within a condition match all", () => {
  const groups = buildExplorerGroups(model);
  assert.deepEqual(filterExplorerGroups(groups, "顧客ID, createdAt").map((group) => group.items[0].href), ["document/0", "database/0"]);
  assert.deepEqual(filterExplorerGroups(groups, "POST customerId, quantity").map((group) => group.items[0].href), ["api/0", "zod/0"]);
  assert.deepEqual(filterExplorerGroups(groups, "　顧客ID　注文　").map((group) => group.items[0].href), ["document/0"]);
  assert.deepEqual(filterExplorerGroups(groups, "顧客ID，createdAt,,").map((group) => group.items[0].href), ["document/0", "database/0"]);
  assert.equal(hasExplorerSearchTerms(" , ，  "), false);
  assert.equal(hasExplorerSearchTerms(" , 注文 "), true);
});

test("Explorer shortcut accepts Ctrl+K and Cmd+K, leaving browser Find alone", () => {
  assert.equal(isExplorerSearchShortcut({ key: "k", ctrlKey: true }), true);
  assert.equal(isExplorerSearchShortcut({ key: "K", metaKey: true }), true);
  assert.equal(isExplorerSearchShortcut({ key: "k", ctrlKey: true, shiftKey: true }), false);
  assert.equal(isExplorerSearchShortcut({ key: "k", ctrlKey: true, altKey: true }), false);
  assert.equal(isExplorerSearchShortcut({ key: "k" }), false);
  assert.equal(isExplorerSearchShortcut({ key: "f", ctrlKey: true }), false);
  assert.equal(isExplorerSearchShortcut({ key: "f", metaKey: true }), false);
});
