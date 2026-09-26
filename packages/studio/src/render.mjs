export function renderStudioHtml(model, mermaid) {
  const data = JSON.stringify(model).replace(/</g, "\\u003c");
  const diagram = JSON.stringify(mermaid).replace(/</g, "\\u003c");
  const title = String(model.config?.studio?.title || "SpecDock").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="API operations, Database, Search specifications, 仕様を検索, API一覧"><title>${title}</title><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/main.css"></head><body><div id="root"></div><script>window.__SPEC_DOCK__=${data};window.__SPEC_DOCK_ER__=${diagram};</script><script type="module" src="/studio.js"></script></body></html>`;
}
