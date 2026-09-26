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

function tableCells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((cell) => cell.trim().replaceAll("\\|", "|"));
}

function isTableDivider(line) {
  const cells = tableCells(line);
  return cells.length > 1 && cells.every((cell) => /^:?-+:?$/.test(cell.replaceAll(" ", "")));
}

export function parseMarkdownBlocks(content) {
  const lines = String(content || "").split("\n");
  const blocks = [];
  let paragraph = [];
  let list = [];
  let code = null;
  const flushParagraph = () => { if (paragraph.length) blocks.push({ type: "paragraph", lines: paragraph }); paragraph = []; };
  let orderedList = false;
  const flushList = () => { if (list.length) blocks.push({ type: "list", ordered: orderedList, lines: list }); list = []; orderedList = false; };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      if (code) { blocks.push({ type: code.language === "mermaid" ? "mermaid" : "code", ...code }); code = null; }
      else { flushParagraph(); flushList(); code = { language: fence[1].trim().toLowerCase(), lines: [] }; }
      continue;
    }
    if (code) { code.lines.push(line); continue; }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { flushParagraph(); flushList(); blocks.push({ type: "heading", level: heading[1].length, text: heading[2] }); continue; }

    if (line.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      flushParagraph(); flushList();
      const headers = tableCells(line);
      const rows = [];
      index++;
      while (index + 1 < lines.length && lines[index + 1].trim().startsWith("|")) rows.push(tableCells(lines[++index]));
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const item = line.match(/^\s*([-*+]|\d+\.)\s+(.+)$/);
    if (item) { flushParagraph(); const ordered = /\d+\./.test(item[1]); if (list.length && ordered !== orderedList) flushList(); orderedList = ordered; list.push(item[2]); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    paragraph.push(line);
  }
  if (code) blocks.push({ type: code.language === "mermaid" ? "mermaid" : "code", ...code });
  flushParagraph();
  flushList();
  return blocks;
}
