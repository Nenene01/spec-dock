import SwaggerParser from "@apidevtools/swagger-parser";

const methods = new Set(["get", "post", "put", "patch", "delete", "options", "head", "trace"]);

function schemaName(value) {
  const reference = value?.$ref;
  if (!reference) return undefined;
  const match = reference.match(/^#\/components\/schemas\/([^/]+)$/);
  return match?.[1];
}

function firstSuccessResponse(operation) {
  return Object.entries(operation?.responses ?? {})
    .filter(([status]) => /^2\d\d$/.test(status))
    .sort(([a], [b]) => a.localeCompare(b))[0];
}

export function parseOpenApiOperations(document, file) {
  const operations = [];
  for (const [path, pathItem] of Object.entries(document?.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!methods.has(method) || !operation) continue;
      const [response, responseDefinition] = firstSuccessResponse(operation) ?? [];
      const content = responseDefinition?.content?.["application/json"] ?? Object.values(responseDefinition?.content ?? {})[0];
      operations.push({
        path,
        method: method.toUpperCase(),
        summary: operation.summary ?? operation.description ?? "",
        response,
        schema: schemaName(content?.schema),
        file,
      });
    }
  }
  return operations;
}

export async function readOpenApiFile(file) {
  try {
    const document = await SwaggerParser.parse(file);
    return { operations: parseOpenApiOperations(document, file), error: null };
  } catch (error) {
    return { operations: [], error: error instanceof Error ? error.message : String(error) };
  }
}
