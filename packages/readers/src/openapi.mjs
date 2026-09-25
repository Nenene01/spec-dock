export function parseOpenApiOperations(text, file) {
  const operations = [];
  let path;
  let operation;
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
      continue;
    }
    if (summaryMatch && operation) operation.summary = summaryMatch[1].trim();
    if (responseMatch && operation) operation.response = responseMatch[1];
    if (refMatch && operation) operation.schema = refMatch[1];
  }
  if (path && operation) operations.push({ path, ...operation, file });
  return operations;
}
