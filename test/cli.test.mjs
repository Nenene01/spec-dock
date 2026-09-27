import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { join } from "node:path";
import { tmpdir } from "node:os";

const run = promisify(execFile);
const root = new URL("..", import.meta.url).pathname;
let fixtureRoot;
let example;
let output;

function parseJsonOutput(stdout) {
  const start = stdout.indexOf("{");
  return JSON.parse(stdout.slice(start));
}

test.before(async () => {
  fixtureRoot = await mkdtemp(join(tmpdir(), "specdock-cli-test-"));
  example = join(fixtureRoot, "order-management");
  output = join(example, ".specdock");
  await cp(join(root, "examples/order-management"), example, { recursive: true, filter: (path) => !path.split("/").includes(".specdock") });
});

test.after(async () => {
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
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
  const project = example;
  const config = join(project, "spec-dock.config.json");
  const original = await readFile(config, "utf8");
  await writeFile(config, '{"api":{"mode":"contract-first"}}\n');
  try {
    const result = await run(process.execPath, [join(root, "cli/src/index.mjs"), "check", "--project", project, "--format", "json"]);
    assert.deepEqual(parseJsonOutput(result.stdout).diagnostics, []);
  } finally {
    await writeFile(config, original);
  }
});

test("check re-scans changed config even when scan.json exists", async () => {
  const project = example;
  const config = join(project, "spec-dock.config.json");
  const original = await readFile(config, "utf8");
  await writeFile(config, "{\n");
  try {
    await assert.rejects(
      run(process.execPath, [join(root, "cli/src/index.mjs"), "check", "--project", project, "--format", "json"]),
      (error) => error.code === 1 && parseJsonOutput(error.stdout).diagnostics.some((item) => item.code === "E004"),
    );
  } finally {
    await writeFile(config, original);
  }
});

test("check re-scans changed OpenAPI after a previous successful scan", async () => {
  const file = join(example, "openapi.yaml");
  const original = await readFile(file, "utf8");
  await writeFile(file, "not-an-openapi-document\n");
  try {
    await assert.rejects(
      run(process.execPath, [join(root, "cli/src/index.mjs"), "check", "--project", example, "--format", "json"]),
      (error) => error.code === 1 && parseJsonOutput(error.stdout).diagnostics.some((item) => item.code === "E005"),
    );
  } finally {
    await writeFile(file, original);
  }
});

test("external config limits sources, supports an API filename, and permits no Zod", async () => {
  const config = join(fixtureRoot, "scoped-config.json");
  const scopedOutput = join(fixtureRoot, "scoped-output");
  await cp(join(example, "openapi.yaml"), join(example, "admin-api.yaml"));
  await writeFile(config, JSON.stringify({
    api: { mode: "contract-first" },
    sources: {
      prisma: ["prisma/schema.prisma"],
      openapi: ["admin-api.yaml"],
      zod: [],
      documents: ["specs/features/api/order-create.md"],
    },
  }));
  await run(process.execPath, [join(root, "cli/src/index.mjs"), "scan", "--project", example, "--config", config, "--out", scopedOutput]);
  const model = JSON.parse(await readFile(join(scopedOutput, "scan.json"), "utf8"));
  assert.deepEqual(model.openapi.files, ["admin-api.yaml"]);
  assert.deepEqual(model.zod.files, []);
  assert.deepEqual(model.markdown.files, ["specs/features/api/order-create.md"]);
  assert.equal(model.prisma.files.length, 1);
  assert.equal(model.diagnostics.filter((item) => item.level === "error").length, 0);
});

test("build creates a browsable HTML artifact", async () => {
  const site = join(output, "site");
  await run(process.execPath, [join(root, "cli/src/index.mjs"), "build", "--project", example]);
  await access(join(site, "index.html"));
  const html = await readFile(join(site, "index.html"), "utf8");
  const publishedModel = JSON.parse(await readFile(join(site, "model.json"), "utf8"));
  assert.match(html, /SpecDock/);
  assert.ok(publishedModel.prisma.models.some((item) => item.name === "Customer"));
  assert.match(html, /Prisma、Zod、OpenAPI、Markdownの仕様を横断して閲覧するStudio/);
  assert.doesNotMatch(html, /Search specifications|仕様を検索/);
  assert.doesNotMatch(html, /window\.__SPEC_DOCK__|<script>/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(html, /src="\.\/studio\.js"/);
  assert.match(html, /href="\.\/main\.css"/);
  assert.match(html, /rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg"/);
  assert.match(await readFile(join(site, "favicon.svg"), "utf8"), /aria-label="SpecDock"/);
  await access(join(site, "specdock-mark.png"));
  const studioScript = await readFile(join(site, "studio.js"), "utf8");
  assert.match(studioScript, /Workbench: Color Theme/);
  assert.match(studioScript, /Hack Nerd Font/);
  assert.match(studioScript, /左右ペインの幅を変更/);
  assert.match(studioScript, /model\.json/);
  assert.doesNotMatch(studioScript, /cdn\.jsdelivr\.net/);
  const assets = await readdir(join(site, "assets"));
  assert.ok(assets.some((name) => /^mermaid\.core-.*\.js$/.test(name)), "Mermaid must be bundled locally");
  assert.ok(assets.some((name) => /^sequenceDiagram-.*\.js$/.test(name)), "Mermaid diagrams must be available offline");
  assert.match(await readFile(join(site, "schema.mmd"), "utf8"), /erDiagram/);
});
