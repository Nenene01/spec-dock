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

test.after(async () => {
  await rm(output, { recursive: true, force: true });
});

test("scan finds project source categories and Prisma models", async () => {
  await run(process.execPath, [join(root, "cli/src/index.mjs"), "scan", "--project", example]);
  const scan = JSON.parse(await readFile(join(output, "scan.json"), "utf8"));
  assert.equal(scan.prisma.models.length, 2);
  assert.equal(scan.zod.files.length, 1);
  assert.equal(scan.openapi.files.length, 1);
  assert.equal(scan.markdown.files.length, 1);
  assert.equal(scan.prisma.models[0].fields[0].name, "id");
  assert.equal(scan.prisma.models[0].fields[2].isRelation, true);
  assert.equal(scan.diagnostics.length, 0);
});

test("check supports JSON diagnostics", async () => {
  const result = await run(process.execPath, [join(root, "cli/src/index.mjs"), "check", "--project", example, "--format", "json"]);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.diagnostics, []);
});

test("build creates a browsable HTML artifact", async () => {
  const site = join(output, "site");
  await run(process.execPath, [join(root, "cli/src/index.mjs"), "build", "--project", example]);
  await access(join(site, "index.html"));
  const html = await readFile(join(site, "index.html"), "utf8");
  assert.match(html, /SpecDock/);
  assert.match(html, /Customer/);
  assert.match(html, /customerId/);
});
