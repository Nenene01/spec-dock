export function parseMarkdownDocument(text, file) {
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
  const summary = text.split("\n").map((line) => line.trim()).find((line) => line && !line.startsWith("#") && !line.startsWith("-") && !line.startsWith("```")) ?? "";
  return { title, summary, file };
}
