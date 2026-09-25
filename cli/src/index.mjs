#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const cwd = process.cwd();
const command = process.argv[2] ?? "help";
const project = resolve(option("--project") ?? cwd);
const outDir = resolve(option("--out") ?? join(project, ".specdock"));
const format = option("--format") ?? "human";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, result = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const entry of entries) {
    if (["node_modules", ".git", ".specdock", "dist"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, result);
    else result.push(path);
  }
  return result;
}

async function readText(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

function diagnostics(model) {
  const items = [];
  if (!model.prisma.files.length) {
    items.push({ code: "E001", level: "error", message: "Prisma Schemaを検出できません", source: "prisma" });
  }
  if (!model.openapi.files.length && !model.zod.files.length) {
    items.push({ code: "E002", level: "error", message: "OpenAPIまたはZod Schemaを検出できません", source: "api" });
  }
  for (const modelItem of model.prisma.models) {
    if (!modelItem.description) {
      items.push({ code: "W001", level: "warning", message: `モデルの説明がありません: ${modelItem.name}`, source: modelItem.file });
    }
  }
  return items;
}

async function scan() {
  const files = await walk(project);
  const prismaFiles = files.filter((file) => file.endsWith(".prisma"));
  const zodFiles = files.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file) && /(schema|contract|api)/i.test(file));
  const openapiFiles = files.filter((file) => /(^|\/)(openapi|api)\.(ya?ml|json)$/i.test(file));
  const markdownFiles = files.filter((file) => /\.md$/i.test(file));
  const models = [];
  for (const file of prismaFiles) {
    const text = await readText(file);
    const modelPattern = /((?:^|\n)\s*\/\/\/[^\n]*\n\s*)*\s*model\s+(\w+)\s*\{([\s\S]*?)\n\s*\}/g;
    for (const match of text.matchAll(modelPattern)) {
      const comments = (match[1] ?? "").match(/\/\/\/\s*(.*)/g)?.map((line) => line.replace(/^\/\/\/\s*/, "")) ?? [];
      models.push({ name: match[2], description: comments.join(" "), fields: match[3].split("\n").map((line) => line.trim()).filter(Boolean), file: relative(project, file) });
    }
  }
  const model = {
    version: 1,
    project: project,
    scannedAt: new Date().toISOString(),
    prisma: { files: prismaFiles.map((file) => relative(project, file)), models },
    zod: { files: zodFiles.map((file) => relative(project, file)) },
    openapi: { files: openapiFiles.map((file) => relative(project, file)) },
    markdown: { files: markdownFiles.map((file) => relative(project, file)) },
  };
  model.diagnostics = diagnostics(model);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "scan.json"), `${JSON.stringify(model, null, 2)}\n`);
  console.log(`Scanned ${project}`);
  console.log(`  Prisma models: ${model.prisma.models.length}`);
  console.log(`  Zod files: ${model.zod.files.length}`);
  console.log(`  OpenAPI files: ${model.openapi.files.length}`);
  console.log(`  Markdown files: ${model.markdown.files.length}`);
  console.log(`  Output: ${join(outDir, "scan.json")}`);
  return model;
}

async function loadScan() {
  if (!(await exists(join(outDir, "scan.json")))) return scan();
  return JSON.parse(await readFile(join(outDir, "scan.json"), "utf8"));
}

async function check() {
  const model = await loadScan();
  const errors = model.diagnostics.filter((item) => item.level === "error");
  if (format === "json") {
    console.log(JSON.stringify({ diagnostics: model.diagnostics }, null, 2));
  } else if (model.diagnostics.length === 0) {
    console.log("No diagnostics.");
  } else {
    for (const item of model.diagnostics) console.log(`${item.code} ${item.level}: ${item.message}`);
  }
  process.exitCode = errors.length ? 1 : 0;
}

async function build() {
  const model = await loadScan();
  const siteDir = resolve(option("--site-out") ?? join(outDir, "site"));
  await mkdir(siteDir, { recursive: true });
  const html = `<!doctype html><meta charset="utf-8"><title>SpecDock</title><style>body{font:16px system-ui;max-width:960px;margin:40px auto;padding:0 20px}code{background:#eee;padding:2px 4px}li{margin:8px 0}</style><h1>SpecDock</h1><p>Source-anchored specifications.</p><h2>Database</h2><ul>${model.prisma.models.map((item) => `<li><strong>${item.name}</strong> — ${item.description || "No description"}</li>`).join("") || "<li>No Prisma models detected.</li>"}</ul><h2>Sources</h2><p>Prisma: ${model.prisma.files.length}, Zod: ${model.zod.files.length}, OpenAPI: ${model.openapi.files.length}, Markdown: ${model.markdown.files.length}</p>`;
  await writeFile(join(siteDir, "index.html"), html);
  await writeFile(join(siteDir, "model.json"), `${JSON.stringify(model, null, 2)}\n`);
  console.log(`Built SpecDock site: ${join(siteDir, "index.html")}`);
}

function help() {
  console.log(`SpecDock — Source-anchored specifications\n\nUsage:\n  specdock scan [--project <path>] [--out <path>]\n  specdock check [--project <path>] [--format human|json]\n  specdock build [--project <path>] [--out <path>] [--site-out <path>]`);
}

if (command === "scan") await scan();
else if (command === "check") await check();
else if (command === "build") await build();
else help();
