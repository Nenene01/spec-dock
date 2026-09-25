function scalar(value) { const trimmed = value.trim(); if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1); return trimmed; }

function readFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?(?:\n|$)/);
  if (!match) return { values: {}, body: text };
  const values = {};
  let section;
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const entry = line.match(/^(\s*)([\w-]+):\s*(.*)$/);
    if (!entry) continue;
    const [, indent, key, value] = entry;
    if (indent.length === 0) { section = key; values[key] = value ? scalar(value) : {}; }
    else if (section && typeof values[section] === "object") values[section][key] = scalar(value);
  }
  return { values, body: text.slice(match[0].length) };
}

export function parseMarkdownDocument(text, file) {
  const { values: frontmatter, body } = readFrontMatter(text);
  const title = frontmatter.title || body.match(/^#\s+(.+)$/m)?.[1]?.trim() || file;
  const summary = frontmatter.summary || body.split("\n").map((line) => line.trim()).find((line) => line && !line.startsWith("#") && !line.startsWith("-") && !line.startsWith("```")) || "";
  const links = [...body.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)].map((match) => match[1].trim()).filter(Boolean);
  const apiRefs = [...body.matchAll(/\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|TRACE)\s+(`?\/[^`\s)]+`?)/g)].map((match) => ({ method: match[1], path: match[2].replaceAll("`", "") }));
  if (frontmatter.api?.method && frontmatter.api?.path) apiRefs.unshift({ method: frontmatter.api.method.toUpperCase(), path: frontmatter.api.path });
  const headings = [...body.matchAll(/^(#{2,6})\s+(.+)$/gm)].map((match) => ({ level: match[1].length, title: match[2].trim() }));
  return { title, summary, frontmatter, links, apiRefs, headings, content: text, body, file };
}
