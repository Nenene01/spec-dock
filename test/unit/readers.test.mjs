import test from "node:test";
import assert from "node:assert/strict";
import { parseOpenApiOperations } from "../../packages/readers/src/openapi.mjs";
import { buildMermaidEr, parsePrismaModels } from "../../packages/readers/src/prisma.mjs";
import { parseZodSchemas } from "../../packages/readers/src/zod.mjs";
import { parseMarkdownDocument } from "../../packages/readers/src/markdown.mjs";

test("Prisma reader extracts models, fields, and relations", () => {
  const models = parsePrismaModels("/// A customer.\nmodel Customer {\n  id String @id\n  orders Order[]\n  @@index([id], map: \"customer_id_idx\")\n}\n\nmodel Order {\n  id String @id\n  customerId String\n  customer Customer @relation(fields: [customerId], references: [id])\n}", "schema.prisma");
  assert.equal(models[0].description, "A customer.");
  assert.equal(models[0].fields[1].isRelation, true);
  assert.equal(models[0].constraints[0].name, "customer_id_idx");
  assert.deepEqual(models[1].fields[2].relation.fields, ["customerId"]);
  assert.deepEqual(models[1].fields[2].relation.references, ["id"]);
  assert.match(buildMermaidEr(models), /Customer \|\|--o\{ Order/);
});

test("OpenAPI reader extracts operation and schema reference", () => {
  const operations = parseOpenApiOperations({ paths: { "/orders": { get: { summary: "List orders", responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/OrderResponse" } } } } } } } } }, "openapi.yaml");
  assert.equal(operations[0].path, "/orders");
  assert.equal(operations[0].method, "GET");
  assert.equal(operations[0].summary, "List orders");
  assert.equal(operations[0].response, "200");
  assert.equal(operations[0].schema, "OrderResponse");
  assert.equal(operations[0].responses[0].schema.ref, "OrderResponse");
});

test("OpenAPI reader retains field constraints", () => {
  const operations = parseOpenApiOperations({ paths: { "/search": { post: { requestBody: { content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["active", "closed"] }, page: { type: "integer", minimum: 1, maximum: 100 } } } } } }, responses: { "200": { description: "ok" } } } } } }, "openapi.yaml");
  assert.deepEqual(operations[0].requestBody.schema.properties.status.enum, ["active", "closed"]);
  assert.equal(operations[0].requestBody.schema.properties.page.minimum, 1);
  assert.equal(operations[0].requestBody.schema.properties.page.maximum, 100);
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
