export function parsePrismaFields(body) {
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
    fields.push({ name, type, isArray: Boolean(array), isOptional: Boolean(optional), isRelation: Boolean(attributes.match(/@relation/) || array), attributes: attributes.trim(), description: comments.join(" ") });
    comments = [];
  }
  return fields;
}

export function parsePrismaModels(text, file) {
  const models = [];
  const modelPattern = /((?:^|\n)\s*\/\/\/[^\n]*\n\s*)*\s*model\s+(\w+)\s*\{([\s\S]*?)\n\s*\}/g;
  for (const match of text.matchAll(modelPattern)) {
    const comments = (match[1] ?? "").match(/\/\/\/\s*(.*)/g)?.map((line) => line.replace(/^\/\/\/\s*/, "")) ?? [];
    models.push({ name: match[2], description: comments.join(" "), fields: parsePrismaFields(match[3]), file });
  }
  return models;
}

export function buildMermaidEr(models) {
  const lines = ["erDiagram"];
  const seen = new Set();
  for (const model of models) {
    for (const field of model.fields.filter((item) => item.isRelation)) {
      const target = field.type;
      if (!models.some((item) => item.name === target)) continue;
      const relationKey = [model.name, target].sort().join(":");
      if (seen.has(relationKey)) continue;
      seen.add(relationKey);
      lines.push(`  ${model.name} ${field.isArray ? "||--o{" : "}o--||"} ${target} : ${field.name}`);
    }
  }
  return lines.join("\n");
}
