import assert from "node:assert/strict";
import test from "node:test";
import { displayDocumentBody, parseMarkdownBlocks } from "../packages/studio/client/reader-content.mjs";

test("document view omits a duplicated frontmatter title and summary", () => {
  const document = {
    title: "注文作成API",
    summary: "注文を作成する。",
    frontmatter: { title: "注文作成API", summary: "注文を作成する。" },
    body: "\n# 注文作成API\n\n注文を作成する。\n\n## 条件\n\n- 商品は必須",
  };
  assert.equal(displayDocumentBody(document), "## 条件\n\n- 商品は必須");
});

test("document view preserves body text when it does not duplicate frontmatter", () => {
  const document = {
    title: "注文作成API",
    summary: "注文を作成する。",
    frontmatter: { title: "注文作成API", summary: "注文を作成する。" },
    body: "# 詳細な手順\n\n注文を作成する。",
  };
  assert.equal(displayDocumentBody(document), document.body);
});

test("document view parses design tables and Mermaid blocks", () => {
  const blocks = parseMarkdownBlocks("| 項目 | 必須 |\n| :--- | :--- |\n| code | ○ |\n\n```mermaid\nsequenceDiagram\nA->>B: request\n```");
  assert.deepEqual(blocks[0], { type: "table", headers: ["項目", "必須"], rows: [["code", "○"]] });
  assert.equal(blocks[1].type, "mermaid");
});

test("document view preserves numbered steps as an ordered list", () => {
  const blocks = parseMarkdownBlocks("1. 認証を確認する。\n2. 保存する。");
  assert.deepEqual(blocks[0], { type: "list", ordered: true, lines: ["認証を確認する。", "保存する。"] });
});
