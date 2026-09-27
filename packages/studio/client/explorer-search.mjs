function searchable(...values) {
  return values.map((value) => typeof value === "string" ? value : JSON.stringify(value ?? "")).join(" ").normalize("NFKC").toLocaleLowerCase("ja");
}

export function buildExplorerGroups(model) {
  return [
    { title: "ドキュメント", icon: "doc", items: model.markdown.documents.map((item, index) => ({ href: `document/${index}`, label: item.title, searchText: searchable(item.title, item.summary, item.file, item.body, item.content) })) },
    { title: "API", icon: "api", items: model.openapi.operations.map((item, index) => ({ href: `api/${index}`, label: `${item.method} ${item.path}`, searchText: searchable(item) })) },
    { title: "ER図", icon: "diagram", items: [{ href: "er", label: "ER図", searchText: searchable("ER図 リレーション データモデル") }] },
    { title: "データモデル", icon: "db", items: model.prisma.models.map((item, index) => ({ href: `database/${index}`, label: item.name, searchText: searchable(item) })) },
    { title: "データ型", icon: "code", items: model.zod.schemas.map((item, index) => ({ href: `zod/${index}`, label: item.name, searchText: searchable(item) })) },
  ];
}

export function filterExplorerGroups(groups, query) {
  const clauses = searchClauses(query);
  if (!clauses.length) return groups;
  return groups.map((group) => ({ ...group, items: group.items.filter((item) => clauses.some((terms) => terms.every((term) => item.searchText.includes(term)))) })).filter((group) => group.items.length);
}

function searchClauses(query) {
  return String(query ?? "").normalize("NFKC").toLocaleLowerCase("ja").split(",").map((clause) => clause.trim().split(/\s+/).filter(Boolean)).filter((terms) => terms.length);
}

export function hasExplorerSearchTerms(query) {
  return searchClauses(query).length > 0;
}

export function isExplorerSearchShortcut(event) {
  return event.key?.toLowerCase() === "k" && Boolean(event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
}
