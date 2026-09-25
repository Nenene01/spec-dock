import test from "node:test";
import assert from "node:assert/strict";
import { parseOpenApiOperations } from "../../packages/readers/src/openapi.mjs";
import { buildMermaidEr, parsePrismaModels } from "../../packages/readers/src/prisma.mjs";
import { parseZodSchemas } from "../../packages/readers/src/zod.mjs";
import { parseMarkdownDocument } from "../../packages/readers/src/markdown.mjs";

test("Prisma reader extracts models, fields, and relations", () => {
  const models = parsePrismaModels("/// A customer.\nmodel Customer {\n  id String @id\n  orders Order[]\n}\n\nmodel Order {\n  id String @id\n  customer Customer\n}", "schema.prisma");
  assert.equal(models[0].description, "A customer.");
  assert.equal(models[0].fields[1].isRelation, true);
  assert.match(buildMermaidEr(models), /Customer \|\|--o\{ Order/);
});

test("OpenAPI reader extracts operation and schema reference", () => {
  const operations = parseOpenApiOperations("  /orders:\n    get:\n      summary: List orders\n        '200':\n          $ref: '#/components/schemas/OrderResponse'", "openapi.yaml");
  assert.deepEqual(operations[0], { path: "/orders", method: "GET", summary: "List orders", response: "200", schema: "OrderResponse", file: "openapi.yaml" });
});

test("Zod reader extracts fields and descriptions", () => {
  const schemas = parseZodSchemas('export const OrderResponse = z.object({\n  id: z.string().describe("Order identifier"),\n});', "order.ts");
  assert.equal(schemas[0].name, "OrderResponse");
  assert.equal(schemas[0].fields[0].description, "Order identifier");
});

test("Markdown reader extracts local links", () => {
  const document = parseMarkdownDocument("# Orders\n\nSee [API](../openapi.yaml) and [missing](missing.md).", "docs/orders.md");
  assert.deepEqual(document.links, ["../openapi.yaml", "missing.md"]);
});
