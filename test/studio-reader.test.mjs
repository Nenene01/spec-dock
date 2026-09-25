import assert from "node:assert/strict";
import test from "node:test";
import { displayDocumentBody } from "../packages/studio/client/reader-content.mjs";

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
