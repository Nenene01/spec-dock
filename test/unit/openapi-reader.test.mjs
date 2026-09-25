import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readOpenApiFile } from "../../packages/readers/src/openapi.mjs";

test("OpenAPI reader parses the YAML example through the standard parser", async () => {
  const result = await readOpenApiFile(fileURLToPath(new URL("../../examples/order-management/openapi.yaml", import.meta.url)));
  assert.equal(result.error, null);
  assert.equal(result.operations[0].path, "/orders");
  assert.equal(result.operations[0].schema, "OrderListResponse");
});

test("OpenAPI reader returns a diagnostic-ready error for invalid input", async () => {
  const result = await readOpenApiFile(new URL("data:text/plain,not-an-openapi-document", import.meta.url));
  assert.equal(result.operations.length, 0);
  assert.equal(typeof result.error, "string");
});
