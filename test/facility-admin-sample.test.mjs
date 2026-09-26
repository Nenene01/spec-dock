import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMarkdownDocument } from "../packages/readers/src/markdown.mjs";
import { readOpenApiFile } from "../packages/readers/src/openapi.mjs";

const sample = fileURLToPath(new URL("../examples/facility-admin/", import.meta.url));

test("facility admin sample pairs every operation with a design document", async () => {
  const { operations, error } = await readOpenApiFile(join(sample, "openapi.yaml"));
  assert.equal(error, null);
  assert.equal(operations.length, 9);
  const documentDirectory = join(sample, "specs/features/api");
  const documents = await Promise.all((await readdir(documentDirectory)).map(async (name) => parseMarkdownDocument(await readFile(join(documentDirectory, name), "utf8"), name)));
  assert.equal(documents.length, operations.length);
  for (const operation of operations) {
    assert.ok(documents.some((document) => document.apiRefs.some((ref) => ref.method === operation.method && ref.path === operation.path)), `${operation.method} ${operation.path} has no design document`);
    assert.ok(operation.responses.length > 1, `${operation.method} ${operation.path} has no error responses`);
  }
});
