import SwaggerParser from "@apidevtools/swagger-parser";

const methods = new Set(["get", "post", "put", "patch", "delete", "options", "head", "trace"]);

function refName(value) {
  const reference = value?.$ref;
  const match = typeof reference === "string" && reference.match(/^#\/components\/schemas\/([^/]+)$/);
  return match?.[1];
}

function summarizeSchema(schema, schemas, seen = new Set()) {
  if (!schema) return undefined;
  const name = refName(schema);
  if (name && schemas?.[name] && !seen.has(name)) {
    const next = new Set(seen).add(name);
    return { ...summarizeSchema(schemas[name], schemas, next), name, ref: name };
  }
  const result = {
    name,
    ref: name,
    type: schema.type,
    format: schema.format,
    description: schema.description,
    required: schema.required,
    enum: schema.enum,
    default: schema.default,
    nullable: schema.nullable,
    minimum: schema.minimum,
    maximum: schema.maximum,
    exclusiveMinimum: schema.exclusiveMinimum,
    exclusiveMaximum: schema.exclusiveMaximum,
    minLength: schema.minLength,
    maxLength: schema.maxLength,
    pattern: schema.pattern,
    minItems: schema.minItems,
    maxItems: schema.maxItems,
  };
  if (schema.items) result.items = summarizeSchema(schema.items, schemas, seen);
  if (schema.properties) result.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, summarizeSchema(value, schemas, seen)]));
  if (schema.allOf) result.allOf = schema.allOf.map((item) => summarizeSchema(item, schemas, seen));
  if (schema.oneOf) result.oneOf = schema.oneOf.map((item) => summarizeSchema(item, schemas, seen));
  if (schema.anyOf) result.anyOf = schema.anyOf.map((item) => summarizeSchema(item, schemas, seen));
  return result;
}

function firstSuccessResponse(operation) {
  return Object.entries(operation?.responses ?? {})
    .filter(([status]) => /^2\d\d$/.test(status))
    .sort(([a], [b]) => a.localeCompare(b))[0];
}

function schemaFromContent(content, schemas) {
  const media = content?.["application/json"] ?? Object.values(content ?? {})[0];
  return summarizeSchema(media?.schema, schemas);
}

function mediaTypeFromContent(content) {
  return Object.keys(content ?? {})[0];
}

function mediaTypesFromContent(content) {
  return Object.keys(content ?? {});
}

function normalizeSecurity(requirements, schemes) {
  return (requirements ?? []).map((requirement) => Object.entries(requirement).map(([name, scopes]) => ({ name, scopes, scheme: schemes?.[name] }))).flat();
}

function normalizeHeaders(headers, schemas) {
  return Object.entries(headers ?? {}).map(([name, header]) => ({ name, description: header.description, required: header.required ?? false, schema: summarizeSchema(header.schema, schemas) }));
}

function normalizeParameters(parameters, schemas) {
  return (parameters ?? []).map((parameter) => ({
    name: parameter.name,
    in: parameter.in,
    description: parameter.description,
    required: parameter.required ?? false,
    schema: summarizeSchema(parameter.schema, schemas),
  }));
}

export function parseOpenApiOperations(document, file) {
  const operations = [];
  const schemas = document?.components?.schemas ?? {};
  const securitySchemes = document?.components?.securitySchemes ?? {};
  for (const [path, pathItem] of Object.entries(document?.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!methods.has(method) || !operation) continue;
      const [response, responseDefinition] = firstSuccessResponse(operation) ?? [];
      const parameters = normalizeParameters([...(pathItem.parameters ?? []), ...(operation.parameters ?? [])], schemas);
      const responses = Object.entries(operation.responses ?? {}).map(([status, definition]) => ({
        status,
        description: definition.description,
        contentTypes: mediaTypesFromContent(definition.content),
        headers: normalizeHeaders(definition.headers, schemas),
        schema: schemaFromContent(definition.content, schemas),
      }));
      operations.push({
        path,
        method: method.toUpperCase(),
        operationId: operation.operationId,
        summary: operation.summary ?? operation.description ?? "",
        tags: operation.tags ?? [],
        servers: (operation.servers ?? document.servers ?? []).map((server) => ({ url: server.url, description: server.description })),
        security: normalizeSecurity(operation.security ?? document.security, securitySchemes),
        parameters,
        requestBody: operation.requestBody ? { required: operation.requestBody.required ?? false, description: operation.requestBody.description, contentType: mediaTypeFromContent(operation.requestBody.content), contentTypes: mediaTypesFromContent(operation.requestBody.content), schema: schemaFromContent(operation.requestBody.content, schemas) } : undefined,
        response,
        schema: schemaFromContent(responseDefinition?.content, schemas)?.ref,
        responses,
        file,
      });
    }
  }
  return operations;
}

export function parseOpenApiSchemas(document, file) {
  const schemas = document?.components?.schemas ?? {};
  return Object.entries(schemas).map(([name, schema]) => ({ name, file, schema: summarizeSchema(schema, schemas) }));
}

export async function readOpenApiFile(file) {
  try {
    const document = await SwaggerParser.parse(file);
    return { operations: parseOpenApiOperations(document, file), schemas: parseOpenApiSchemas(document, file), error: null };
  } catch (error) {
    return { operations: [], schemas: [], error: error instanceof Error ? error.message : String(error) };
  }
}
