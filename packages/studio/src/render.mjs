export function renderStudioHtml(model) {
  const title = String(model.config?.studio?.title || "SpecDock").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Prisma、Zod、OpenAPI、Markdownの仕様を横断して閲覧するStudio"><title>${title}</title><link rel="icon" type="image/svg+xml" href="./favicon.svg"><link rel="stylesheet" href="./main.css"></head><body><div id="root"></div><script type="module" src="./studio.js"></script></body></html>`;
}
