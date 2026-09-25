export function parseMarkdownDocument(text, file) {
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
  const summary = text.split("\n").map((line) => line.trim()).find((line) => line && !line.startsWith("#") && !line.startsWith("-") && !line.startsWith("```")) ?? "";
  const links = [...text.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)].map((match) => match[1].trim()).filter(Boolean);
  return { title, summary, links, file };
}
