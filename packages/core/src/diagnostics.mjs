import { dirname, normalize, posix } from "node:path";

function schemaReferences(schema, result = new Set()) {
  if (!schema) return result;
  if (schema.ref) result.add(schema.ref);
  for (const field of Object.values(schema.properties ?? {})) schemaReferences(field, result);
  schemaReferences(schema.items, result);
  for (const item of [...(schema.allOf ?? []), ...(schema.oneOf ?? []), ...(schema.anyOf ?? [])]) schemaReferences(item, result);
  return result;
}

export function diagnostics(model) {
  const items = [];
  const apiMode = model.config?.api?.mode;
  if (model.config?.parseError) {
    items.push({ code: "E004", level: "error", message: "SpecDock設定ファイルがJSONとして不正です", source: model.config.file });
  } else if (!['contract-first', 'code-first'].includes(apiMode)) {
    items.push({ code: "E004", level: "error", message: `API契約モードが不正です: ${apiMode ?? "未設定"}`, source: model.config?.file ?? "project" });
  }
  for (const error of model.openapi.errors ?? []) items.push({ code: "E005", level: "error", message: `OpenAPIを解析できません: ${error.message}`, source: error.file });
  if (!model.prisma.files.length) items.push({ code: "E001", level: "error", message: "Prisma Schemaを検出できません", source: "prisma" });
  if (!model.openapi.files.length && !model.zod.files.length) items.push({ code: "E002", level: "error", message: "OpenAPIまたはZod Schemaを検出できません", source: "api" });
  if (apiMode === "code-first") {
    const zodNames = new Set(model.zod.schemas.map((schema) => schema.name));
    const referencedSchemas = new Set();
    for (const operation of model.openapi.operations) {
      const references = schemaReferences(operation.requestBody?.schema);
      if (operation.schema) references.add(operation.schema);
      for (const response of operation.responses ?? []) schemaReferences(response.schema, references);
      for (const reference of references) {
        referencedSchemas.add(reference);
        if (!zodNames.has(reference)) items.push({ code: "E003", level: "error", message: `OpenAPIの参照先Zodスキーマがありません: ${reference}`, source: operation.file });
      }
    }
    for (const schema of model.zod.schemas) {
      if (!referencedSchemas.has(schema.name)) items.push({ code: "W002", level: "warning", message: `APIから参照されていないZodスキーマがあります: ${schema.name}`, source: schema.file });
    }
  }
  for (const modelItem of model.prisma.models) {
    if (!modelItem.description) items.push({ code: "W001", level: "warning", message: `モデルの説明がありません: ${modelItem.name}`, source: modelItem.file });
  }
  const knownFiles = new Set([...model.prisma.files, ...model.openapi.files, ...model.zod.files, ...model.markdown.files].map((file) => normalize(file)));
  for (const document of model.markdown.documents) {
    for (const target of document.links ?? []) {
      if (/^(https?:|mailto:|\/)/i.test(target)) continue;
      const resolved = normalize(posix.join(dirname(document.file), target));
      if (!knownFiles.has(resolved)) items.push({ code: "W003", level: "warning", message: `文書リンクの参照先が見つかりません: ${target}`, source: document.file });
    }
  }
  return items;
}
