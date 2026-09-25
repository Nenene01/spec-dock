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
  const zodNames = new Set(model.zod.schemas.map((schema) => schema.name));
  for (const operation of model.openapi.operations) {
    if (operation.schema && !zodNames.has(operation.schema)) {
      items.push({ code: "E003", level: "error", message: `OpenAPIの参照先Zodスキーマがありません: ${operation.schema}`, source: operation.file });
    }
  }
  for (const modelItem of model.prisma.models) {
    if (!modelItem.description) {
      items.push({ code: "W001", level: "warning", message: `モデルの説明がありません: ${modelItem.name}`, source: modelItem.file });
    }
  }
  return items;
}

function parsePrismaFields(body) {
  const fields = [];
  let comments = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("///")) {
      comments.push(line.replace(/^\/\/\/\s*/, ""));
      continue;
    }
    if (line.startsWith("//") || line.startsWith("@@")) continue;
    const match = line.match(/^(\w+)\s+([\w]+)(\[\])?(\?)?\s*(.*)$/);
    if (!match) {
      comments = [];
      continue;
    }
    const [, name, type, array, optional, attributes] = match;
    fields.push({
      name,
      type,
      isArray: Boolean(array),
      isOptional: Boolean(optional),
      isRelation: Boolean(attributes.match(/@relation/) || array),
      attributes: attributes.trim(),
      description: comments.join(" "),
    });
    comments = [];
  }
  return fields;
}

function parseOpenApiOperations(text, file) {
  const operations = [];
  let path;
  let operation;
  let summary;
  let response;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const pathMatch = line.match(/^\s{2}(\/[^:]+):\s*$/);
    const methodMatch = line.match(/^\s{4}(get|post|put|patch|delete|options|head|trace):\s*$/i);
    const summaryMatch = line.match(/^\s{6}summary:\s*(.*)$/);
    const responseMatch = line.match(/^\s{8}'?([1-5][0-9]{2})'?:\s*$/);
    const refMatch = line.match(/^\s+\$ref:\s*["']?#\/components\/schemas\/([^"']+)["']?\s*$/);
    if (pathMatch) {
      path = pathMatch[1];
      operation = undefined;
      continue;
    }
    if (methodMatch && path) {
      if (operation) operations.push({ path, ...operation, file });
      operation = { method: methodMatch[1].toUpperCase(), summary: "", response: undefined };
      summary = undefined;
      response = undefined;
      continue;
    }
    if (summaryMatch && operation) {
      summary = summaryMatch[1].trim();
      operation.summary = summary;
      continue;
    }
    if (responseMatch && operation) {
      response = responseMatch[1];
      operation.response = response;
    }
    if (refMatch && operation) operation.schema = refMatch[1];
  }
  if (path && operation) operations.push({ path, ...operation, file });
  return operations;
}

function parseZodSchemas(text, file) {
  const schemas = [];
  const schemaPattern = /export\s+const\s+(\w+)\s*=\s*z\.object\(\{([\s\S]*?)\}\)/g;
  for (const match of text.matchAll(schemaPattern)) {
    const fields = [];
    for (const rawLine of match[2].split("\n")) {
      const fieldMatch = rawLine.trim().match(/^(\w+)\s*:\s*z\.([\w]+)([\s\S]*)[,;]?$/);
      if (!fieldMatch) continue;
      const description = fieldMatch[3].match(/\.describe\(["']([^"']+)["']\)/)?.[1] ?? "";
      fields.push({ name: fieldMatch[1], type: fieldMatch[2], description });
    }
    schemas.push({ name: match[1], fields, file });
  }
  return schemas;
}

function buildMermaidEr(models) {
  const lines = ["erDiagram"];
  const seen = new Set();
  for (const model of models) {
    for (const field of model.fields.filter((item) => item.isRelation)) {
      const target = field.type;
      if (!models.some((item) => item.name === target)) continue;
      const relationKey = [model.name, target].sort().join(":");
      if (seen.has(relationKey)) continue;
      seen.add(relationKey);
      const cardinality = field.isArray ? "||--o{" : "}o--||";
      lines.push(`  ${model.name} ${cardinality} ${target} : ${field.name}`);
    }
  }
  return [...new Set(lines)].join("\n");
}

async function scan() {
  const files = await walk(project);
  const prismaFiles = files.filter((file) => file.endsWith(".prisma"));
  const zodFiles = files.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file) && /(schema|contract|api)/i.test(file));
  const openapiFiles = files.filter((file) => /(^|\/)(openapi|api)\.(ya?ml|json)$/i.test(file));
  const markdownFiles = files.filter((file) => /\.md$/i.test(file));
  const models = [];
  const operations = [];
  const schemas = [];
  for (const file of prismaFiles) {
    const text = await readText(file);
    const modelPattern = /((?:^|\n)\s*\/\/\/[^\n]*\n\s*)*\s*model\s+(\w+)\s*\{([\s\S]*?)\n\s*\}/g;
    for (const match of text.matchAll(modelPattern)) {
      const comments = (match[1] ?? "").match(/\/\/\/\s*(.*)/g)?.map((line) => line.replace(/^\/\/\/\s*/, "")) ?? [];
      models.push({ name: match[2], description: comments.join(" "), fields: parsePrismaFields(match[3]), file: relative(project, file) });
    }
  }
  for (const file of openapiFiles) {
    operations.push(...parseOpenApiOperations(await readText(file), relative(project, file)));
  }
  for (const file of zodFiles) {
    schemas.push(...parseZodSchemas(await readText(file), relative(project, file)));
  }
  const model = {
    version: 1,
    project: project,
    scannedAt: new Date().toISOString(),
    prisma: { files: prismaFiles.map((file) => relative(project, file)), models },
    zod: { files: zodFiles.map((file) => relative(project, file)), schemas },
    openapi: { files: openapiFiles.map((file) => relative(project, file)), operations },
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
  const mermaid = buildMermaidEr(model.prisma.models);
  await writeFile(join(siteDir, "schema.mmd"), `${mermaid}\n`);
  const modelCards = model.prisma.models.map((item) => `<article class="model-card" data-search="${item.name} ${item.description} ${item.fields.map((field) => `${field.name} ${field.description}`).join(" ")}"><h3>${item.name}</h3><p>${item.description || "No description"}</p><table><thead><tr><th>Field</th><th>Type</th><th>Flags</th><th>Description</th></tr></thead><tbody>${item.fields.map((field) => `<tr><td><code>${field.name}</code></td><td>${field.type}${field.isArray ? "[]" : ""}${field.isOptional ? "?" : ""}</td><td>${[field.isRelation ? "relation" : "", field.attributes.includes("@id") ? "primary key" : ""].filter(Boolean).join(", ")}</td><td>${field.description || ""}</td></tr>`).join("")}</tbody></table></article>`).join("");
  const operationRows = model.openapi.operations.map((item) => `<tr><td><code>${item.method}</code></td><td><code>${item.path}</code></td><td>${item.summary || ""}</td><td>${item.response || ""}</td><td>${item.schema || ""}</td></tr>`).join("");
  const zodCards = model.zod.schemas.map((schema) => `<article class="zod-card" data-search="${schema.name} ${schema.fields.map((field) => `${field.name} ${field.description}`).join(" ")}"><h3>${schema.name}</h3><p><code>${schema.file}</code></p><table><thead><tr><th>Field</th><th>Zod type</th><th>Description</th></tr></thead><tbody>${schema.fields.map((field) => `<tr><td><code>${field.name}</code></td><td>${field.type}</td><td>${field.description}</td></tr>`).join("")}</tbody></table></article>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SpecDock</title><style>:root{color-scheme:light dark}body{font:16px system-ui;max-width:1100px;margin:40px auto;padding:0 20px}header{border-bottom:1px solid #888;margin-bottom:28px}article{border:1px solid #888;border-radius:8px;padding:16px;margin:16px 0}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;border-bottom:1px solid #888;padding:8px;vertical-align:top}code{background:#8883;padding:2px 4px;border-radius:3px}.summary{display:flex;gap:12px;flex-wrap:wrap}.summary span{border:1px solid #888;border-radius:999px;padding:6px 10px}.search{width:100%;box-sizing:border-box;padding:10px;margin:12px 0 20px;font:inherit}.hidden{display:none}.mermaid{padding:16px;border:1px solid #888;border-radius:8px;white-space:pre;overflow:auto}</style><header><h1>SpecDock</h1><p>Source-anchored specifications.</p><input class="search" id="search" placeholder="Search models, fields, schemas, and descriptions..." /></header><main><h2>Overview</h2><div class="summary"><span>Prisma models: ${model.prisma.models.length}</span><span>API operations: ${model.openapi.operations.length}</span><span>Zod schemas: ${model.zod.schemas.length}</span><span>OpenAPI files: ${model.openapi.files.length}</span><span>Markdown files: ${model.markdown.files.length}</span></div><h2>API</h2><table><thead><tr><th>Method</th><th>Path</th><th>Summary</th><th>Response</th><th>Zod schema</th></tr></thead><tbody>${operationRows || "<tr><td colspan=5>No API operations detected.</td></tr>"}</tbody></table><h2>ER Diagram</h2><pre class="mermaid">${mermaid}</pre><p><a href="schema.mmd">Download Mermaid source</a></p><h2>Zod</h2>${zodCards || "<p>No Zod schemas detected.</p>"}<h2>Database</h2>${modelCards || "<p>No Prisma models detected.</p>"}</main><script>const input=document.querySelector('#search');input.addEventListener('input',()=>{const query=input.value.toLowerCase();document.querySelectorAll('[data-search]').forEach((element)=>element.classList.toggle('hidden',query&&!element.dataset.search.toLowerCase().includes(query)));});</script>`;
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
