export function parseMarkdownDocument(text, file) {
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
  const summary = text.split("\n").map((line) => line.trim()).find((line) => line && !line.startsWith("#") && !line.startsWith("-") && !line.startsWith("```")) ?? "";
  const links = [...text.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)].map((match) => match[1].trim()).filter(Boolean);
  const apiRefs = [...text.matchAll(/\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|TRACE)\s+(`?\/[^`\s)]+`?)/g)].map((match) => ({ method: match[1], path: match[2].replaceAll("`", "") }));
  const headings = [...text.matchAll(/^(#{2,6})\s+(.+)$/gm)].map((match) => ({ level: match[1].length, title: match[2].trim() }));
  return { title, summary, links, apiRefs, headings, content: text, file };
}
