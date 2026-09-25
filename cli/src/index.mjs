#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
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

function parseMarkdownDocument(text, file) {
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
  const summary = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith("-") && !line.startsWith("```")) ?? "";
  return { title, summary, file };
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
  const documents = [];
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
  for (const file of markdownFiles) {
    documents.push(parseMarkdownDocument(await readText(file), relative(project, file)));
  }
  const model = {
    version: 1,
    project: project,
    scannedAt: new Date().toISOString(),
    prisma: { files: prismaFiles.map((file) => relative(project, file)), models },
    zod: { files: zodFiles.map((file) => relative(project, file)), schemas },
    openapi: { files: openapiFiles.map((file) => relative(project, file)), operations },
    markdown: { files: markdownFiles.map((file) => relative(project, file)), documents },
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character]));
}

function renderStudioHtml(model, mermaid) {
  const data = JSON.stringify(model).replace(/</g, "\\u003c");
  const script = `<script>
const model = window.__SPEC_DOCK__;
const app = document.querySelector("#app");
const search = document.querySelector("#search");
let currentView = location.hash.slice(1) || "overview";
const esc = (value) => String(value == null ? "" : value).replace(/[&<>]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const matches = (value) => !search.value || String(value).toLowerCase().includes(search.value.toLowerCase());
function table(headers, rows, empty) { return rows.length ? "<table><thead><tr>" + headers.map((h) => "<th>" + h + "</th>").join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table>" : "<p class=empty>" + empty + "</p>"; }
function overview() {
  return "<section class=hero><p class=eyebrow>SPECIFICATION WORKSPACE</p><h1>Understand the source.</h1><p>Prisma, Zod, OpenAPI, and Markdown connected in one place.</p></section><div class=stats><button data-view=api><strong>" + model.openapi.operations.length + "</strong><span>API operations</span></button><button data-view=database><strong>" + model.prisma.models.length + "</strong><span>Database models</span></button><button data-view=zod><strong>" + model.zod.schemas.length + "</strong><span>Zod schemas</span></button><button data-view=documents><strong>" + model.markdown.documents.length + "</strong><span>Documents</span></button></div><section class=panel><h2>Project sources</h2><p>Scanned at " + esc(model.scannedAt) + "</p><div class=source-list><code>Prisma: " + model.prisma.files.join(", ") + "</code><code>OpenAPI: " + model.openapi.files.join(", ") + "</code><code>Zod: " + model.zod.files.join(", ") + "</code><code>Markdown: " + model.markdown.files.join(", ") + "</code></div></section>";
}
function apiView() {
  const rows = model.openapi.operations.filter((item) => matches(item.path + " " + item.method + " " + item.summary + " " + item.schema)).map((item) => "<tr><td><span class=method>" + esc(item.method) + "</span></td><td><code>" + esc(item.path) + "</code></td><td>" + esc(item.summary) + "</td><td>" + esc(item.response) + "</td><td>" + esc(item.schema) + "</td></tr>");
  return "<section class=page-header><p class=eyebrow>INTERFACE</p><h1>API operations</h1><p>OpenAPI paths connected to their response schemas.</p></section>" + table(["Method", "Path", "Summary", "Response", "Zod schema"], rows, "No API operations found.");
}
function databaseView() {
  const cards = model.prisma.models.filter((item) => matches(item.name + " " + item.description + " " + item.fields.map((f) => f.name + " " + f.description).join(" "))).map((item) => "<article class=model-card><div class=card-title><div><p class=eyebrow>MODEL</p><h2>" + esc(item.name) + "</h2></div><code>" + esc(item.file) + "</code></div><p>" + esc(item.description || "No description") + "</p>" + table(["Field", "Type", "Flags", "Description"], item.fields.map((field) => "<tr><td><code>" + esc(field.name) + "</code></td><td>" + esc(field.type + (field.isArray ? "[]" : "") + (field.isOptional ? "?" : "")) + "</td><td>" + esc([field.isRelation ? "relation" : "", field.attributes.includes("@id") ? "primary key" : ""].filter(Boolean).join(", ")) + "</td><td>" + esc(field.description) + "</td></tr>"), "No fields found.") + "</article>");
  return "<section class=page-header><p class=eyebrow>DATABASE</p><h1>Models</h1><p>Prisma models and their relationships.</p></section>" + (cards.join("") || "<p class=empty>No models found.</p>");
}
function zodView() {
  const cards = model.zod.schemas.filter((item) => matches(item.name + " " + item.fields.map((f) => f.name + " " + f.description).join(" "))).map((schema) => "<article class=model-card><div class=card-title><div><p class=eyebrow>VALIDATION SCHEMA</p><h2>" + esc(schema.name) + "</h2></div><code>" + esc(schema.file) + "</code></div>" + table(["Field", "Zod type", "Description"], schema.fields.map((field) => "<tr><td><code>" + esc(field.name) + "</code></td><td>" + esc(field.type) + "</td><td>" + esc(field.description) + "</td></tr>"), "No fields found.") + "</article>");
  return "<section class=page-header><p class=eyebrow>VALIDATION</p><h1>Zod schemas</h1><p>Runtime validation and inferred application contracts.</p></section>" + (cards.join("") || "<p class=empty>No Zod schemas found.</p>");
}
function documentsView() {
  const cards = model.markdown.documents.filter((item) => matches(item.title + " " + item.summary + " " + item.file)).map((document) => "<article class=doc-card><p class=eyebrow>DOCUMENT</p><h2>" + esc(document.title) + "</h2><p>" + esc(document.summary) + "</p><code>" + esc(document.file) + "</code></article>");
  return "<section class=page-header><p class=eyebrow>KNOWLEDGE</p><h1>Documents</h1><p>Business context, decisions, and terminology.</p></section>" + (cards.join("") || "<p class=empty>No documents found.</p>");
}
function erView() { return "<section class=page-header><p class=eyebrow>RELATIONSHIPS</p><h1>ER diagram</h1><p>Generated from Prisma relations.</p></section><pre class=diagram>" + esc(${JSON.stringify(mermaid)}) + "</pre><p><a href=schema.mmd>Download Mermaid source</a></p>"; }
function render() { document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("active", item.dataset.view === currentView)); app.innerHTML = ({overview,api:apiView,database:databaseView,zod:zodView,documents:documentsView,er:erView}[currentView] || overview)(); }
document.querySelectorAll("[data-view]").forEach((item) => item.addEventListener("click", () => { currentView = item.dataset.view; location.hash = currentView; render(); }));
search.addEventListener("input", render); window.addEventListener("hashchange", () => { currentView = location.hash.slice(1) || "overview"; render(); }); render();
</script>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SpecDock</title><style>:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#17202a;background:#f6f7f9}*{box-sizing:border-box}body{margin:0}.shell{display:grid;grid-template-columns:240px minmax(0,1fr);min-height:100vh}.sidebar{background:#111827;color:#d1d5db;padding:24px 16px}.brand{color:#fff;font-size:20px;font-weight:750;margin:0 8px 6px}.tagline{font-size:12px;color:#9ca3af;margin:0 8px 32px}.nav-label,.eyebrow{font-size:11px;letter-spacing:.12em;font-weight:700;color:#8b95a7}.nav-label{margin:22px 8px 8px}.nav button{display:block;width:100%;border:0;background:transparent;color:#cbd5e1;text-align:left;padding:10px 12px;border-radius:8px;font:inherit;cursor:pointer}.nav button:hover,.nav button.active{background:#25314a;color:#fff}.content{min-width:0}.topbar{height:72px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;padding:0 40px;gap:20px}.search{width:min(560px,100%);padding:11px 14px;border:1px solid #d1d5db;border-radius:8px;font:inherit}.main{max-width:1120px;margin:0 auto;padding:48px 40px}.hero{padding:12px 0 34px}.hero h1,.page-header h1{font-size:38px;line-height:1.1;margin:8px 0 12px;color:#111827}.hero p:not(.eyebrow),.page-header p:not(.eyebrow){color:#667085;font-size:17px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}.stats button{background:#fff;border:1px solid #e5e7eb;border-radius:12px;text-align:left;padding:18px;cursor:pointer}.stats button:hover{border-color:#8796b0;transform:translateY(-1px)}.stats strong,.stats span{display:block}.stats strong{font-size:28px;color:#111827}.stats span{color:#667085;margin-top:5px}.panel,.model-card,.doc-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:22px;margin:18px 0}.panel h2,.model-card h2,.doc-card h2{margin:0 0 8px;color:#111827}.source-list{display:grid;gap:8px}.source-list code{overflow:auto}.card-title{display:flex;align-items:start;justify-content:space-between;gap:16px}.page-header{margin-bottom:28px}.page-header p{margin:6px 0}.model-card code,.doc-card code{color:#667085;font-size:13px}table{border-collapse:collapse;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0 24px}th,td{text-align:left;border-bottom:1px solid #eef0f3;padding:12px;vertical-align:top;font-size:14px}th{color:#667085;font-size:12px;text-transform:uppercase;letter-spacing:.05em;background:#fafafa}tr:last-child td{border-bottom:0}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f0f2f5;border-radius:4px;padding:2px 5px;color:#344054}.method{display:inline-block;background:#e0f2fe;color:#075985;border-radius:5px;padding:4px 7px;font-size:12px;font-weight:700}.diagram{background:#111827;color:#e5e7eb;padding:22px;border-radius:12px;overflow:auto;line-height:1.6}.empty{padding:24px;background:#fff;border:1px dashed #cbd5e1;border-radius:10px;color:#667085}@media(max-width:760px){.shell{grid-template-columns:1fr}.sidebar{padding:16px}.nav{display:flex;flex-wrap:wrap;gap:4px}.nav-label{display:none}.nav button{width:auto}.topbar{padding:0 16px}.main{padding:28px 16px}.stats{grid-template-columns:repeat(2,1fr)}.card-title{display:block}.card-title code{display:block;margin-top:8px}}}</style></head><body><div class=shell><aside class=sidebar><p class=brand>SpecDock</p><p class=tagline>Source-anchored specifications.</p><nav class=nav><p class=nav-label>EXPLORE</p><button data-view=overview>Overview</button><button data-view=api>API operations</button><button data-view=database>Database</button><button data-view=zod>Zod schemas</button><button data-view=er>ER diagram</button><button data-view=documents>Documents</button></nav></aside><div class=content><header class=topbar><input id=search class=search placeholder="Search specifications..." /></header><main id=app class=main></main></div></div><script>window.__SPEC_DOCK__=${data};</script>${script}</body></html>`;
}

async function build({ rescan = true } = {}) {
  const model = rescan ? await scan() : await loadScan();
  const siteDir = resolve(option("--site-out") ?? join(outDir, "site"));
  await mkdir(siteDir, { recursive: true });
  const mermaid = buildMermaidEr(model.prisma.models);
  await writeFile(join(siteDir, "schema.mmd"), `${mermaid}\n`);
  const html = renderStudioHtml(model, mermaid);
  await writeFile(join(siteDir, "index.html"), html);
  await writeFile(join(siteDir, "model.json"), `${JSON.stringify(model, null, 2)}\n`);
  console.log(`Built SpecDock site: ${join(siteDir, "index.html")}`);
}

async function serve({ watchProject = false } = {}) {
  await build();
  const siteDir = resolve(option("--site-out") ?? join(outDir, "site"));
  const port = Number(option("--port") ?? 4173);
  const server = createServer(async (request, response) => {
    const requested = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
    const file = requested === "/" ? "index.html" : requested.replace(/^\//, "");
    if (file.includes("..")) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const path = join(siteDir, file);
    try {
      const body = await readFile(path);
      const type = file.endsWith(".html") ? "text/html; charset=utf-8" : file.endsWith(".mmd") ? "text/plain; charset=utf-8" : "application/json; charset=utf-8";
      response.writeHead(200, { "content-type": type });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  server.on("error", (error) => {
    console.error(`Unable to start Studio: ${error.message}`);
    server.close(() => process.exit(1));
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`SpecDock Studio: http://localhost:${port}`);
    console.log("Press Ctrl-C to stop.");
  });
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
  console.log(`SpecDock — Source-anchored specifications\n\nUsage:\n  specdock scan [--project <path>] [--out <path>]\n  specdock check [--project <path>] [--format human|json]\n  specdock build [--project <path>] [--out <path>] [--site-out <path>]\n  specdock serve [--project <path>] [--port <number>]`);
  console.log("  specdock dev   [--project <path>] [--port <number>]  # serve + watch");
}

if (command === "scan") await scan();
else if (command === "check") await check();
else if (command === "build") await build();
else if (command === "serve") await serve();
else if (command === "dev") await serve({ watchProject: true });
else help();
