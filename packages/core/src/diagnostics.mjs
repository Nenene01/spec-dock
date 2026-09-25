export function diagnostics(model) {
  const items = [];
  if (!model.prisma.files.length) items.push({ code: "E001", level: "error", message: "Prisma Schemaを検出できません", source: "prisma" });
  if (!model.openapi.files.length && !model.zod.files.length) items.push({ code: "E002", level: "error", message: "OpenAPIまたはZod Schemaを検出できません", source: "api" });
  const zodNames = new Set(model.zod.schemas.map((schema) => schema.name));
  for (const operation of model.openapi.operations) {
    if (operation.schema && !zodNames.has(operation.schema)) items.push({ code: "E003", level: "error", message: `OpenAPIの参照先Zodスキーマがありません: ${operation.schema}`, source: operation.file });
  }
  for (const modelItem of model.prisma.models) {
    if (!modelItem.description) items.push({ code: "W001", level: "warning", message: `モデルの説明がありません: ${modelItem.name}`, source: modelItem.file });
  }
  return items;
}
