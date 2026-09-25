#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { buildMermaidEr } from "../../packages/readers/src/prisma.mjs";
import { loadScan, scanProject } from "../../packages/core/src/scan.mjs";
import { renderStudioHtml } from "../../packages/studio/src/render.mjs";

const project = resolve(option("--project") ?? process.cwd());
const outDir = resolve(option("--out") ?? join(project, ".specdock"));
const format = option("--format") ?? "human";
const command = process.argv[2] ?? "help";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function scan() {
  const result = await scanProject(project, outDir);
  console.log(`Scanned ${project}`);
  console.log(`  Prisma models: ${result.counts.prisma}`);
  console.log(`  Zod files: ${result.counts.zod}`);
  console.log(`  OpenAPI files: ${result.counts.openapi}`);
  console.log(`  Markdown files: ${result.counts.markdown}`);
  console.log(`  Output: ${join(outDir, "scan.json")}`);
  return result.model;
}

async function currentModel() { return (await loadScan(outDir)) ?? await scan(); }

async function check() {
  const model = await currentModel();
  const errors = model.diagnostics.filter((item) => item.level === "error");
  if (format === "json") console.log(JSON.stringify({ diagnostics: model.diagnostics }, null, 2));
  else if (!model.diagnostics.length) console.log("No diagnostics.");
  else for (const item of model.diagnostics) console.log(`${item.code} ${item.level}: ${item.message}`);
  process.exitCode = errors.length ? 1 : 0;
}

async function build() {
  const model = await scan();
  const siteDir = resolve(option("--site-out") ?? join(outDir, "site"));
  await mkdir(siteDir, { recursive: true });
  const mermaid = buildMermaidEr(model.prisma.models);
  await writeFile(join(siteDir, "schema.mmd"), `${mermaid}\n`);
  await writeFile(join(siteDir, "index.html"), renderStudioHtml(model, mermaid));
  await writeFile(join(siteDir, "model.json"), `${JSON.stringify(model, null, 2)}\n`);
  console.log(`Built SpecDock Studio: ${join(siteDir, "index.html")}`);
}

async function serve({ watchProject = false } = {}) {
  await build();
  const siteDir = resolve(option("--site-out") ?? join(outDir, "site"));
  const port = Number(option("--port") ?? 4173);
  const server = createServer(async (request, response) => {
    const requested = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
    const file = requested === "/" ? "index.html" : requested.replace(/^\//, "");
    if (file.includes("..")) return response.writeHead(403).end("Forbidden");
    try {
      const body = await readFile(join(siteDir, file));
      const type = file.endsWith(".html") ? "text/html; charset=utf-8" : file.endsWith(".mmd") ? "text/plain; charset=utf-8" : "application/json; charset=utf-8";
      response.writeHead(200, { "content-type": type }).end(body);
    } catch { response.writeHead(404).end("Not found"); }
  });
  server.on("error", (error) => { console.error(`Unable to start Studio: ${error.message}`); server.close(() => process.exit(1)); });
  server.listen(port, "127.0.0.1", () => { console.log(`SpecDock Studio: http://localhost:${port}`); console.log("Press Ctrl-C to stop."); });
  if (watchProject) {
    const { watch } = await import("node:fs");
    let timer;
    watch(project, { recursive: true }, (event, filename) => {
      if (!filename || filename.includes("node_modules") || filename.includes(".git") || filename.includes(".specdock")) return;
      clearTimeout(timer);
      timer = setTimeout(() => build().catch((error) => console.error(`Rebuild failed: ${error.message}`)), 150);
    });
    console.log(`Watching ${project}`);
  }
}

function help() {
  console.log(`SpecDock — Source-anchored specifications\n\nUsage:\n  specdock scan [--project <path>] [--out <path>]\n  specdock check [--project <path>] [--format human|json]\n  specdock build [--project <path>] [--out <path>] [--site-out <path>]\n  specdock serve [--project <path>] [--port <number>]\n  specdock dev   [--project <path>] [--port <number>]`);
}

if (command === "scan") await scan();
else if (command === "check") await check();
else if (command === "build") await build();
else if (command === "serve") await serve();
else if (command === "dev") await serve({ watchProject: true });
else help();
