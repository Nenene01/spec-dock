import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile, rm } from "node:fs/promises";
import { promisify } from "node:util";
import { join } from "node:path";

const run = promisify(execFile);
const root = new URL("..", import.meta.url).pathname;
const example = join(root, "examples/order-management");
const output = join(example, ".specdock");

function parseJsonOutput(stdout) {
  const start = stdout.indexOf("{");
  return JSON.parse(stdout.slice(start));
}

test.after(async () => {
  await rm(output, { recursive: true, force: true });
});

test("scan finds project source categories and Prisma models", async () => {
  await run(process.execPath, [join(root, "cli/src/index.mjs"), "scan", "--project", example]);
  const scan = JSON.parse(await readFile(join(output, "scan.json"), "utf8"));
  assert.equal(scan.prisma.models.length, 4);
  assert.equal(scan.zod.files.length, 1);
  assert.equal(scan.openapi.files.length, 1);
  assert.equal(scan.openapi.operations.length, 4);
  assert.equal(scan.openapi.operations[0].method, "GET");
  assert.equal(scan.openapi.operations[0].path, "/orders");
  assert.equal(scan.openapi.operations[0].schema, "OrderListResponse");
  assert.equal(scan.config.studio.title, "SpecDock");
  assert.equal(scan.config.studio.subtitle, "ソース仕様に接続する開発Studio");
  assert.equal(scan.config.api.mode, "code-first");
  assert.deepEqual(scan.sourceCatalog.zod, ["src/schemas"]);
  assert.deepEqual(scan.sourceCatalog.documents, ["specs"]);
  assert.ok(scan.zod.schemas.some((schema) => schema.name === "OrderDetail"));
  assert.equal(scan.zod.schemas.find((schema) => schema.name === "OrderSummary").fields[0].description, "注文ID");
  assert.ok(scan.markdown.documents.some((document) => document.title === "注文管理"));
  assert.equal(scan.markdown.files.length, 5);
  assert.equal(scan.prisma.models[0].fields[0].name, "id");
  assert.equal(scan.prisma.models.find((model) => model.name === "Order").fields.find((field) => field.name === "customer").isRelation, true);
  assert.equal(scan.diagnostics.length, 0);
});

test("check supports JSON diagnostics", async () => {
  const result = await run(process.execPath, [join(root, "cli/src/index.mjs"), "check", "--project", example, "--format", "json"]);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.diagnostics, []);
});

test("contract-first mode does not require OpenAPI references to match Zod", async () => {
  const project = join(root, "examples/order-management");
  const config = join(project, "spec-dock.config.json");
  const original = await readFile(config, "utf8");
  await import("node:fs/promises").then(({ writeFile }) => writeFile(config, '{"api":{"mode":"contract-first"}}\n'));
  try {
    await rm(output, { recursive: true, force: true });
    const result = await run(process.execPath, [join(root, "cli/src/index.mjs"), "check", "--project", project, "--format", "json"]);
    assert.deepEqual(parseJsonOutput(result.stdout).diagnostics, []);
  } finally {
    await import("node:fs/promises").then(({ writeFile }) => writeFile(config, original));
  }
});

test("invalid project config is reported as an error", async () => {
  const project = join(root, "examples/order-management");
  const config = join(project, "spec-dock.config.json");
  const original = await readFile(config, "utf8");
  await import("node:fs/promises").then(({ writeFile }) => writeFile(config, "{\n"));
  try {
    await rm(output, { recursive: true, force: true });
    await assert.rejects(
      run(process.execPath, [join(root, "cli/src/index.mjs"), "check", "--project", project, "--format", "json"]),
      (error) => error.code === 1 && parseJsonOutput(error.stdout).diagnostics.some((item) => item.code === "E004"),
    );
  } finally {
    await import("node:fs/promises").then(({ writeFile }) => writeFile(config, original));
  }
});

test("build creates a browsable HTML artifact", async () => {
  const site = join(output, "site");
  await run(process.execPath, [join(root, "cli/src/index.mjs"), "build", "--project", example]);
  await access(join(site, "index.html"));
  const html = await readFile(join(site, "index.html"), "utf8");
  assert.match(html, /SpecDock/);
  assert.match(html, /Customer/);
  assert.match(html, /API operations/);
  assert.match(html, /Database/);
  assert.match(html, /Search specifications/);
  assert.match(html, /仕様を検索/);
  assert.match(html, /API一覧/);
  assert.match(html, /window.__SPEC_DOCK__/);
  assert.match(html, /erDiagram/);
  assert.match(html, /rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/);
  assert.match(await readFile(join(site, "favicon.svg"), "utf8"), /aria-label="SpecDock"/);
  await access(join(site, "schema.mmd"));
});
