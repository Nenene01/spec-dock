import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseMarkdownDocument } from "../../readers/src/markdown.mjs";
import { parseOpenApiOperations } from "../../readers/src/openapi.mjs";
import { buildMermaidEr, parsePrismaModels } from "../../readers/src/prisma.mjs";
import { parseZodSchemas } from "../../readers/src/zod.mjs";
import { diagnostics } from "./diagnostics.mjs";

async function walk(dir, result = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return result; }
  for (const entry of entries) {
    if (["node_modules", ".git", ".specdock", "dist"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, result);
    else result.push(path);
  }
  return result;
}

async function readText(path) {
  try { return await readFile(path, "utf8"); } catch { return ""; }
}

export async function scanProject(project, outDir) {
  const files = await walk(project);
  const prismaFiles = files.filter((file) => file.endsWith(".prisma"));
  const zodFiles = files.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file) && /(schema|contract|api)/i.test(file));
  const openapiFiles = files.filter((file) => /(^|\/)(openapi|api)\.(ya?ml|json)$/i.test(file));
  const markdownFiles = files.filter((file) => /\.md$/i.test(file));
  const models = [];
  const operations = [];
  const schemas = [];
  const documents = [];
  for (const file of prismaFiles) models.push(...parsePrismaModels(await readText(file), relative(project, file)));
  for (const file of openapiFiles) operations.push(...parseOpenApiOperations(await readText(file), relative(project, file)));
  for (const file of zodFiles) schemas.push(...parseZodSchemas(await readText(file), relative(project, file)));
  for (const file of markdownFiles) documents.push(parseMarkdownDocument(await readText(file), relative(project, file)));
  const model = {
    version: 1,
    project: ".",
    scannedAt: new Date().toISOString(),
    prisma: { files: prismaFiles.map((file) => relative(project, file)), models },
    zod: { files: zodFiles.map((file) => relative(project, file)), schemas },
    openapi: { files: openapiFiles.map((file) => relative(project, file)), operations },
    markdown: { files: markdownFiles.map((file) => relative(project, file)), documents },
  };
  model.diagnostics = diagnostics(model);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "scan.json"), `${JSON.stringify(model, null, 2)}\n`);
  return { model, mermaid: buildMermaidEr(models), counts: { prisma: models.length, zod: zodFiles.length, openapi: openapiFiles.length, markdown: markdownFiles.length } };
}

export async function loadScan(outDir) {
  try { return JSON.parse(await readFile(join(outDir, "scan.json"), "utf8")); }
  catch { return null; }
}
