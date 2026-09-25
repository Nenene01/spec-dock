export function displayDocumentBody(document) {
  let body = document.body || document.content || "";
  if (!document.frontmatter?.title) return body;
  const lines = body.split("\n");
  while (lines[0]?.trim() === "") lines.shift();
  if (lines[0]?.trim() !== `# ${document.title}`) return body;
  lines.shift();
  while (lines[0]?.trim() === "") lines.shift();
  if (document.frontmatter.summary && lines[0]?.trim() === document.summary) {
    lines.shift();
    while (lines[0]?.trim() === "") lines.shift();
  }
  return lines.join("\n");
}
