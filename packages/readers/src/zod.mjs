export function parseZodSchemas(text, file) {
  const schemas = [];
  const schemaPattern = /export\s+const\s+(\w+)\s*=\s*z\.object\(\{([\s\S]*?)\}\)/g;
  for (const match of text.matchAll(schemaPattern)) {
    const fields = [];
    for (const rawLine of match[2].split("\n")) {
      const fieldMatch = rawLine.trim().match(/^(\w+)\s*:\s*z\.([\w]+)([\s\S]*)[,;]?$/);
      if (!fieldMatch) continue;
      fields.push({ name: fieldMatch[1], type: fieldMatch[2], description: fieldMatch[3].match(/\.describe\(["']([^"']+)["']\)/)?.[1] ?? "" });
    }
    schemas.push({ name: match[1], fields, file });
  }
  return schemas;
}
