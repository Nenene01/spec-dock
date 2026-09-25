#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { join, resolve, sep } from "node:path";
import { buildMermaidEr } from "../../packages/readers/src/prisma.mjs";
import { loadScan, scanProject } from "../../packages/core/src/scan.mjs";
import { renderStudioHtml } from "../../packages/studio/src/render.mjs";
import { build as viteBuild } from "vite";

const project = resolve(option("--project") ?? process.cwd());
const outDir = resolve(option("--out") ?? join(project, ".specdock"));
const format = option("--format") ?? "human";
const command = process.argv[2] ?? "help";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function walkFiles(dir, result = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return result; }
  for (const entry of entries) {
    if (["node_modules", ".git", ".specdock", "dist"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walkFiles(path, result);
    else result.push(path);
  }
  return result;
}

function unique(values) { return [...new Set(values.filter(Boolean))]; }
function relativePath(file) { return file.replace(`${project}/`, ""); }

async function init() {
  const configFile = join(project, "spec-dock.config.json");
  let existing;
  try { existing = await readFile(configFile, "utf8"); } catch { existing = null; }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (existing && !process.argv.includes("--force")) {
      const answer = await rl.question("spec-dock.config.jsonは既に存在します。上書きしますか？ [y/N] ");
      if (!/^y(es)?$/i.test(answer.trim())) { console.log("初期設定をキャンセルしました。"); return; }
    }
    const files = await walkFiles(project);
    const prisma = files.filter((file) => file.endsWith(".prisma")).map(relativePath);
    const openapi = files.filter((file) => /(^|\/)(openapi|api)\.(ya?ml|json)$/i.test(file)).map(relativePath);
    const zod = unique(files.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file) && /(schema|contract|api)/i.test(file)).map((file) => relativePath(file).replace(/\/[^/]+$/, "")));
    const documents = unique(files.filter((file) => /\.md$/i.test(file)).map((file) => relativePath(file).split("/")[0]));
    const ask = async (label, fallback) => { const answer = await rl.question(`${label} [${fallback || "なし"}] `); return answer.trim() || fallback; };
    const askList = async (label, values) => (await ask(label, values.join(","))).split(",").map((value) => value.trim()).filter(Boolean);
    const mode = await ask("API契約モード（contract-first / code-first）", "code-first");
    const studioTitle = await ask("Studio名", "SpecDock");
    const studioSubtitle = await ask("Studioサブタイトル", "ソース仕様に接続する開発Studio");
    const config = { studio: { title: studioTitle, subtitle: studioSubtitle }, api: { mode: ["contract-first", "code-first"].includes(mode) ? mode : "code-first" }, sources: { prisma: await askList("Prisma Schema", prisma), openapi: await askList("OpenAPI", openapi), zod: await askList("Zodディレクトリ", zod), documents: await askList("Documentsディレクトリ", documents) } };
    await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`初期設定を保存しました: ${configFile}`);
  } finally { rl.close(); }
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
  process.env.SPECDOCK_SITE_OUT = siteDir;
  await viteBuild({ configFile: resolve("packages/studio/vite.config.mjs"), logLevel: "error" });
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
      const type = file.endsWith(".html") ? "text/html; charset=utf-8" : file.endsWith(".js") ? "text/javascript; charset=utf-8" : file.endsWith(".css") ? "text/css; charset=utf-8" : file.endsWith(".mmd") ? "text/plain; charset=utf-8" : "application/json; charset=utf-8";
      response.writeHead(200, { "content-type": type }).end(body);
    } catch { response.writeHead(404).end("Not found"); }
  });
  server.on("error", (error) => { console.error(`Unable to start Studio: ${error.message}`); server.close(() => process.exit(1)); });
  server.listen(port, "127.0.0.1", () => { console.log(`SpecDock Studio: http://localhost:${port}`); console.log("Press Ctrl-C to stop."); });
  if (watchProject) {
    const { watch } = await import("node:fs");
    let timer;
    watch(project, { recursive: true }, (event, filename) => {
      const changedPath = filename ? resolve(project, String(filename)) : "";
      const outputPath = resolve(outDir);
      if (!filename || changedPath.includes(`${sep}node_modules${sep}`) || changedPath.includes(`${sep}.git${sep}`) || changedPath === outputPath || changedPath.startsWith(`${outputPath}${sep}`)) return;
      clearTimeout(timer);
      timer = setTimeout(() => build().catch((error) => console.error(`Rebuild failed: ${error.message}`)), 150);
    });
    console.log(`Watching ${project}`);
  }
}

function help() {
  console.log(`SpecDock — Source-anchored specifications\n\nUsage:\n  specdock init  [--project <path>] [--force]\n  specdock scan  [--project <path>] [--out <path>]\n  specdock check [--project <path>] [--format human|json]\n  specdock build [--project <path>] [--out <path>] [--site-out <path>]\n  specdock serve [--project <path>] [--port <number>]\n  specdock dev   [--project <path>] [--port <number>]`);
}

if (command === "init") await init();
else if (command === "scan") await scan();
else if (command === "check") await check();
else if (command === "build") await build();
else if (command === "serve") await serve();
else if (command === "dev") await serve({ watchProject: true });
else help();
