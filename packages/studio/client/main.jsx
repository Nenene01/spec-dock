import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { HiCog, HiDatabase, HiDocumentText, HiOutlineCode, HiOutlineEye, HiOutlineShare, HiOutlineViewBoards, HiShare, HiViewGrid } from "react-icons/hi";
import dagre from "@dagrejs/dagre";
import { Background, BackgroundVariant, BaseEdge, Controls, EdgeLabelRenderer, Handle, Panel, Position, ReactFlow, ReactFlowProvider, getBezierPath, useEdgesState, useNodesState, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./styles.css";
import Overview from "./Overview.jsx";
import { appearanceStyles, defaultAppearance, loadAppearance, preferredFontStack, saveAppearance, themeOptions } from "./appearance.mjs";
import { normalizeSplitRatio, splitGridColumns, splitRatioFromPointer, splitRatioStorageKey } from "./split-layout.mjs";
import { displayDocumentBody, parseMarkdownBlocks } from "./reader-content.mjs";

let model;
const esc = (value) => String(value ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const iconComponents = { grid: HiViewGrid, doc: HiDocumentText, api: HiShare, db: HiDatabase, diagram: HiOutlineShare, panelLeft: HiOutlineViewBoards, eye: HiOutlineEye, code: HiOutlineCode, settings: HiCog };
function Icon({ name }) { const Component = iconComponents[name] || HiViewGrid; return <Component className="icon" aria-hidden="true" />; }
function parseRoute(route) { const [view, id] = (route || "").split("/"); return { view, id }; }
function titleOf(route) { const { view, id } = parseRoute(route); if (view === "overview") return "概要"; if (view === "settings") return "設定"; if (view === "er") return "ER図"; if (view === "api") return id ? `${model.openapi.operations[Number(id)]?.method} ${model.openapi.operations[Number(id)]?.path}` : "API"; if (view === "database") return id ? model.prisma.models[Number(id)]?.name : "データモデル"; if (view === "zod") return id ? model.zod.schemas[Number(id)]?.name : "データ型"; return model.markdown.documents[Number(id)]?.title || "Document"; }
function Table({ headers, rows, empty = "データはありません" }) { return rows.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="仕様項目の表"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows}</tbody></table></div> : <p className="empty">{empty}</p>; }
function schemaType(schema) { if (!schema) return ""; if (schema.type === "array") return `${schemaType(schema.items)}[]`; return schema.ref || schema.name || schema.type || "object"; }
function DataTypeLink({ name, open }) { const label = String(name || ""); const baseName = label.replace(/(?:\[\]|\?)$/, "").split("/").pop(); const index = model.zod.schemas.findIndex((schema) => schema.name === baseName); return index >= 0 && open ? <button className="type-link" onClick={() => open(`zod/${index}`)}>{label}</button> : <>{label}</>; }
function schemaConstraint(schema) { return [schema.format, schema.enum?.length ? `enum: ${schema.enum.join(", ")}` : "", schema.minimum != null ? `最小 ${schema.minimum}` : "", schema.maximum != null ? `最大 ${schema.maximum}` : "", schema.minLength != null ? `最小文字数 ${schema.minLength}` : "", schema.maxLength != null ? `最大文字数 ${schema.maxLength}` : "", schema.minItems != null ? `最小件数 ${schema.minItems}` : "", schema.maxItems != null ? `最大件数 ${schema.maxItems}` : "", schema.default != null ? `既定値 ${schema.default}` : ""].filter(Boolean).join(" / "); }
function schemaRows(schema, prefix = "", open) { if (!schema) return []; const rows = []; const add = (value, name, required, path) => { const currentPath = path ? `${path}.${name}` : name; rows.push(<tr key={currentPath}><td><code>{currentPath}</code></td><td><code><DataTypeLink name={schemaType(value)} open={open}/></code></td><td>{required ? "必須" : "任意"}</td><td>{schemaConstraint(value)}</td><td>{value.description || ""}</td></tr>); if (value.properties) rows.push(...schemaRows(value, currentPath, open)); if (value.items?.properties) rows.push(...schemaRows(value.items, `${currentPath}[]`, open)); }; if (schema.allOf) schema.allOf.forEach((part) => rows.push(...schemaRows(part, prefix, open))); Object.entries(schema.properties || {}).forEach(([name, value]) => add(value, name, schema.required?.includes(name), prefix)); return rows; }
function SchemaTable({ schema, open }) { return <Table headers={["項目", "型", "必須", "制約", "説明"]} rows={schemaRows(schema, "", open)} empty="スキーマ定義はありません。"/>; }
function securityLabel(security) { if (!security?.length) return "認証なし"; return security.map((item) => { const scheme = item.scheme; if (scheme?.type === "http") return `${scheme.scheme === "bearer" ? "Bearer" : scheme.scheme} ${scheme.bearerFormat ? `(${scheme.bearerFormat})` : ""}`.trim(); if (scheme?.type === "apiKey") return `${scheme.name} (${scheme.in})`; return item.name; }).join(" / "); }
function Head({ eyebrow, title, description }) { const labels = { "API DETAIL": "API", "DATA MODEL DETAIL": "データモデル", "DATA TYPE DETAIL": "データ型", DOCUMENT: "ドキュメント" }; return <header className="page-header"><span className="eyebrow">{labels[eyebrow] || eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</header>; }
function ApiPage({ id, open }) { if (id == null) return <><Head eyebrow="INTERFACE" title="API一覧" description="APIの入出力と制約を確認します。" /><p className="empty">サイドバーからAPIを選択してください。</p></>; const item = model.openapi.operations[Number(id)]; const responseHeaders = (item.responses || []).flatMap((response) => (response.headers || []).map((header) => ({ ...header, status: response.status }))); return <><Head eyebrow="API DETAIL" title={`${item.method} ${item.path}`} description={item.summary || item.operationId} /><section className="panel api-contract"><h2>API概要</h2><div className="contract-grid"><div><span>認証方式</span><strong>{securityLabel(item.security)}</strong></div><div><span>サーバー</span><strong>{item.servers?.[0]?.url || "定義なし"}</strong></div><div><span>操作ID</span><strong>{item.operationId || "定義なし"}</strong></div></div></section><section className="panel"><h2>パラメータ / ヘッダー</h2><Table headers={["名前", "場所", "型", "必須", "説明"]} rows={(item.parameters || []).map((p) => <tr key={`${p.in}-${p.name}`}><td><code>{p.name}</code></td><td>{p.in}</td><td><DataTypeLink name={p.schema?.type || p.schema?.ref || ""} open={open}/></td><td>{p.required ? "必須" : "任意"}</td><td>{p.description || ""}</td></tr>)} empty="パラメータとヘッダーはありません。" /></section>{item.requestBody && <section className="panel request-body"><div className="section-heading"><h2>リクエストボディ</h2><span className={item.requestBody.required ? "required-badge" : "optional-badge"}>{item.requestBody.required ? "必須" : "任意"}</span></div><div className="schema-meta">{(item.requestBody.contentTypes || [item.requestBody.contentType || "application/json"]).map((type) => <code key={type}>{type}</code>)}{item.requestBody.schema?.ref && <DataTypeLink name={item.requestBody.schema.ref} open={open}/>}</div>{item.requestBody.description && <p className="muted">{item.requestBody.description}</p>}<SchemaTable schema={item.requestBody.schema} open={open}/></section>}<section className="panel"><h2>レスポンス</h2><Table headers={["Status", "説明", "Content-Type", "スキーマ"]} rows={(item.responses || []).map((r) => <tr key={r.status}><td>{r.status}</td><td>{r.description}</td><td>{(r.contentTypes || []).join(", ") || "—"}</td><td><DataTypeLink name={r.schema?.ref || r.schema?.type || "—"} open={open}/></td></tr>)}/>{responseHeaders.length > 0 && <><h3>Response headers</h3><Table headers={["Status", "Header", "型", "必須", "説明"]} rows={responseHeaders.map((header) => <tr key={`${header.status}-${header.name}`}><td>{header.status}</td><td><code>{header.name}</code></td><td><DataTypeLink name={header.schema?.type || header.schema?.ref || ""} open={open}/></td><td>{header.required ? "必須" : "任意"}</td><td>{header.description || ""}</td></tr>)}/></>}</section></>; }
function DatabasePage({ id, open }) { if (id == null) return <><Head eyebrow="DATA MODEL" title="データモデル" description="Prismaで定義されたモデル、インデックス、制約、リレーションを確認します。" /><p className="empty">サイドバーからモデルを選択してください。</p></>; const item = model.prisma.models[Number(id)]; const relations = item.fields.filter((field) => field.isRelation).map((field) => ({ field, targetIndex: model.prisma.models.findIndex((candidate) => candidate.name === field.type) })); return <><Head eyebrow="DATA MODEL DETAIL" title={item.name} description={item.description} /><section className="panel"><h2>フィールド</h2><Table headers={["名前", "型", "属性", "説明"]} rows={item.fields.map((f) => <tr key={f.name}><td><code>{f.name}</code></td><td><DataTypeLink name={`${f.type}${f.isArray ? "[]" : ""}${f.isOptional ? "?" : ""}`} open={open}/></td><td>{[f.isId && "PK", f.isUnique && "UK", f.dbType].filter(Boolean).join(" / ")}</td><td>{f.description}</td></tr>)}/></section><section className="panel"><h2>リレーション</h2><Table headers={["フィールド", "関連モデル", "関係", "接続"]} rows={relations.map(({ field, targetIndex }) => <tr key={field.name}><td><code>{field.name}</code></td><td>{targetIndex >= 0 ? <button className="link-button relation-target" onClick={() => open?.(`database/${targetIndex}`)}>{field.type}</button> : <code>{field.type}</code>}</td><td><span className="relation-kind">{field.isArray ? "複数" : "単一"}</span></td><td>{field.relation ? <><code>{field.relation.fields.join(", ")}</code> → <code>{field.relation.references.join(", ")}</code></> : "対応する外部キーを定義"}</td></tr>)} empty="リレーションはありません。" /></section><section className="panel"><h2>インデックス・制約</h2><Table headers={["種類", "フィールド", "名前"]} rows={(item.constraints || []).map((c) => <tr key={c.name || c.fields.join(",")}><td>{c.kind}</td><td>{c.fields.join(", ")}</td><td>{c.name || ""}</td></tr>)} empty="モデル制約はありません。"/></section></>; }
function ZodPage({ id }) { if (id == null) return <><Head eyebrow="DATA TYPE" title="データ型" description="Zodで定義された入出力のデータ型と制約を確認します。" /><p className="empty">サイドバーからデータ型を選択してください。</p></>; const item = model.zod.schemas[Number(id)]; return <><Head eyebrow="DATA TYPE DETAIL" title={item.name} description={item.file}/><Table headers={["項目", "Zod型", "説明"]} rows={item.fields.map((field) => <tr key={field.name}><td><code>{field.name}</code></td><td>{field.type}</td><td>{field.description}</td></tr>)}/></>; }
function InlineMarkdown({ text }) { const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g).filter(Boolean); return <>{parts.map((part, index) => { if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>; if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>; const link = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/); if (link) return <a key={index} href={link[2]}>{link[1]}</a>; return <React.Fragment key={index}>{part}</React.Fragment>; })}</>; }
function MermaidBlock({ source }) { const ref = useRef(null); useEffect(() => { let cancelled = false; import("mermaid").then(({ default: mermaid }) => { if (cancelled || !ref.current) return; mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" }); return mermaid.run({ nodes: [ref.current] }); }).catch(() => { if (!cancelled && ref.current) ref.current.textContent = source; }); return () => { cancelled = true; }; }, [source]); return <div className="doc-mermaid"><div ref={ref} className="mermaid">{source}</div></div>; }
function MarkdownView({ content }) {
  return <>{parseMarkdownBlocks(content).map((block, index) => {
    if (block.type === "heading") { const Heading = `h${block.level}`; return <Heading key={index}><InlineMarkdown text={block.text}/></Heading>; }
    if (block.type === "list") { const List = block.ordered ? "ol" : "ul"; return <List key={index}>{block.lines.map((line, itemIndex) => <li key={itemIndex}><InlineMarkdown text={line}/></li>)}</List>; }
    if (block.type === "table") return <div className="doc-table-scroll" key={index} tabIndex={0} role="region" aria-label="文書の表"><table><thead><tr>{block.headers.map((header, cellIndex) => <th key={cellIndex}><InlineMarkdown text={header}/></th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{block.headers.map((_, cellIndex) => <td key={cellIndex}><InlineMarkdown text={row[cellIndex] || ""}/></td>)}</tr>)}</tbody></table></div>;
    if (block.type === "mermaid") return <MermaidBlock key={index} source={block.lines.join("\n")}/>;
    if (block.type === "code") return <pre className="doc-fenced-code" key={index}><code>{block.lines.join("\n")}</code></pre>;
    return <p key={index}><InlineMarkdown text={block.lines.join("\n")}/></p>;
  })}</>;
}
function DocumentPage({ id, open }) {
  const item = model.markdown.documents[Number(id)];
  const [mode, setMode] = useState("view");
  const related = (item.relatedOperations || []).map((key) => ({ key, index: model.openapi.operations.findIndex((operation) => `${operation.method} ${operation.path}` === key) })).filter(({ index }) => index >= 0);
  return <>
    <Head eyebrow="DOCUMENT" title={item.title} description={item.summary}/>
    {related.length > 0 && <nav className="reader-context-links" aria-label="この文書に対応するAPI"><span>対応するAPI</span>{related.map(({ key, index }) => <button key={key} onClick={() => open(`api/${index}`)}>{key}<span aria-hidden="true">↗</span></button>)}</nav>}
    <div className="document-toolbar"><code>{item.file}</code><div className="document-mode-actions"><button className={mode === "view" ? "active" : ""} onClick={() => setMode("view")}><Icon name="eye"/>表示</button><button className={mode === "code" ? "active" : ""} onClick={() => setMode("code")}><Icon name="code"/>Code</button></div></div>
    <section className="panel">{mode === "view" ? <div className="doc-view"><MarkdownView content={displayDocumentBody(item)}/></div> : <pre className="doc-code">{item.content}</pre>}</section>
  </>;
}
function erFieldType(field) { return field.type + (field.isArray ? "[]" : "") + (field.isOptional ? "?" : ""); }
function erNodeHeight(modelItem) { return 44 + modelItem.fields.length * 28 + ((modelItem.constraints || []).length ? 30 : 0); }
function buildErGraph(models) {
  const byName = new Map(models.map((item) => [item.name, item]));
  const nodes = models.map((item) => ({ id: item.name, type: "erModel", position: { x: 0, y: 0 }, data: { model: item } }));
  const candidates = [];
  models.forEach((item) => item.fields.filter((field) => field.isRelation).forEach((field) => candidates.push({ item, field })));
  candidates.sort((a, b) => Number(!a.field.relation) - Number(!b.field.relation));
  const seen = new Set();
  const edges = [];
  candidates.forEach(({ item, field }) => {
    const target = byName.get(field.type);
    if (!target) return;
    const pair = [item.name, target.name].sort().join("::");
    if (seen.has(pair)) return;
    seen.add(pair);
    const sourceField = field.relation?.fields?.[0] || (field.isArray ? null : field.name);
    const targetField = field.relation?.references?.[0] || null;
    edges.push({
      id: pair,
      source: item.name,
      target: target.name,
      sourceHandle: sourceField ? "source:" + sourceField : "source:model",
      targetHandle: targetField ? "target:" + targetField : "target:model",
      type: "erRelation",
      data: { label: field.name },
    });
  });
  return { nodes, edges };
}
function layoutErGraph(nodes, edges, saved = {}) {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 70, ranksep: 180, marginx: 80, marginy: 80 });
  nodes.forEach((node) => graph.setNode(node.id, { width: 300, height: erNodeHeight(node.data.model) }));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);
  return nodes.map((node) => {
    const size = graph.node(node.id);
    return {
      ...node,
      position: saved[node.id] || { x: size.x - 150, y: size.y - erNodeHeight(node.data.model) / 2 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });
}
function ErModelNode({ data }) {
  const item = data.model;
  return <article className="er-model-node">
    <header className="er-model-header">
      <Handle type="target" position={Position.Left} id="target:model" className="er-handle" />
      <strong>{item.name}</strong>
      <span>{item.fields.length}</span>
      <Handle type="source" position={Position.Right} id="source:model" className="er-handle" />
    </header>
    <div className="er-model-fields">
      {item.fields.map((field) => <div className="er-model-field" key={field.name}>
        <Handle type="target" position={Position.Left} id={"target:" + field.name} className="er-handle" />
        <span className={"er-field-mark " + (field.isId ? "is-key" : field.relation ? "is-relation" : "")}>{field.isId ? "◆" : field.relation ? "↗" : "·"}</span>
        <span className="er-field-name">{field.name}</span>
        {field.isUnique && <small className="er-field-badge">UK</small>}
        <span className="er-field-type">{erFieldType(field)}</span>
        <Handle type="source" position={Position.Right} id={"source:" + field.name} className="er-handle" />
      </div>)}
    </div>
    {(item.constraints || []).length > 0 && <footer className="er-model-constraints">{item.constraints.map((constraint) => <span key={constraint.name || constraint.fields.join(",")}><b>{constraint.kind}</b>{constraint.fields.join(", ")}</span>)}</footer>}
  </article>;
}
function ErRelationEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerStart, markerEnd, data }) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.22 });
  return <><BaseEdge id={id} path={path} markerStart={markerStart} markerEnd={markerEnd} />
    {data?.label && <EdgeLabelRenderer><div className="er-relation-label" style={{ transform: "translate(-50%, -50%) translate(" + labelX + "px, " + labelY + "px)" }}>{data.label}</div></EdgeLabelRenderer>}
  </>;
}
const erNodeTypes = { erModel: ErModelNode };
const erEdgeTypes = { erRelation: ErRelationEdge };
function ErCanvas() {
  const structure = useMemo(() => buildErGraph(model.prisma.models), []);
  const storageKey = "specdock:er-layout:" + (model.prisma.files?.[0] || "schema.prisma");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(structure.edges);
  const { fitView } = useReactFlow();
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let saved = {};
    try { saved = JSON.parse(window.localStorage.getItem(storageKey) || "{}"); } catch {}
    const next = layoutErGraph(structure.nodes, structure.edges, saved);
    setNodes(next);
    setEdges(structure.edges);
    setTimeout(() => fitView({ padding: 0.12, duration: 300 }), 0);
  }, [fitView, setEdges, setNodes, storageKey, structure]);
  const persist = (items) => {
    window.localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(items.map((node) => [node.id, node.position]))));
  };
  const relayout = () => {
    setNodes((current) => {
      const next = layoutErGraph(current.map((node) => ({ ...node, position: { x: 0, y: 0 } })), structure.edges);
      persist(next);
      setTimeout(() => fitView({ padding: 0.12, duration: 300 }), 0);
      return next;
    });
  };
  return <div className="er-canvas">
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={erNodeTypes} edgeTypes={erEdgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeDragStop={() => setNodes((current) => { persist(current); return current; })} nodesConnectable={false} nodesDraggable fitView minZoom={0.1} maxZoom={2.2} proOptions={{ hideAttribution: true }}>
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--studio-border)" />
      <Controls showInteractive={false} position="bottom-left" />
      <Panel position="top-right" className="er-flow-panel"><button onClick={relayout}><Icon name="grid" />Auto layout</button></Panel>
    </ReactFlow>
  </div>;
}
function ErPage() {
  return <section className="er-workspace"><header className="er-header"><div><span className="eyebrow">PRISMA SCHEMA</span><h1>ER図</h1></div></header><ReactFlowProvider><ErCanvas /></ReactFlowProvider></section>;
}
function SettingsPage({ appearance, updateAppearance, resetAppearance }) {
  const [sizeDraft, setSizeDraft] = useState(String(appearance.fontSize));
  useEffect(() => setSizeDraft(String(appearance.fontSize)), [appearance.fontSize]);
  const updateSize = (value) => { setSizeDraft(value); const size = Number(value); if (Number.isInteger(size) && size >= 10 && size <= 28) updateAppearance({ fontSize: size }); };
  return <div className="settings-page">
    <Head eyebrow="STUDIO" title="設定" description="エディタの表示を調整します。変更はこのブラウザに保存されます。"/>
    <div className="settings-list">
      <div className="setting-row">
        <label htmlFor="studio-theme">Workbench: Color Theme</label>
        <p>Studioで使用する配色を選択します。現在はダークテーマのみ対応しています。</p>
        <select id="studio-theme" value={appearance.theme} onChange={(event) => updateAppearance({ theme: event.target.value })}>{themeOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select>
      </div>
      <div className="setting-row">
        <label htmlFor="studio-font">Editor: Font Family</label>
        <p>フォントファミリーを指定します。利用できないフォントは次の候補へ切り替わります。</p>
        <input id="studio-font" type="text" list="studio-font-families" value={appearance.fontFamily} maxLength={180} onChange={(event) => updateAppearance({ fontFamily: event.target.value })} spellCheck={false}/>
        <datalist id="studio-font-families"><option value="Menlo"/><option value='"Hack Nerd Font"'/><option value="Monaco"/><option value={preferredFontStack}/></datalist>
        <button className="font-preset" type="button" onClick={() => updateAppearance({ fontFamily: preferredFontStack })}>Menlo / Hack Nerd Font / Monaco を適用</button>
      </div>
      <div className="setting-row">
        <label htmlFor="studio-font-size">Editor: Font Size</label>
        <p>文字サイズをピクセル単位で指定します（10～28）。</p>
        <input id="studio-font-size" type="number" min="10" max="28" step="1" value={sizeDraft} onChange={(event) => updateSize(event.target.value)} onBlur={() => setSizeDraft(String(appearance.fontSize))}/>
      </div>
    </div>
    <button className="settings-reset" onClick={() => { resetAppearance(); setSizeDraft(String(defaultAppearance.fontSize)); }}>表示設定を初期値に戻す</button>
  </div>;
}
function ActivityRail({ toggleExplorer, openSettings, settingsActive }) { return <aside className="activity-rail"><button className="active" title="Explorerを表示" aria-label="Explorerを表示" onClick={toggleExplorer}><Icon name="grid"/></button><button className={`rail-settings ${settingsActive ? "active" : ""}`} title="設定" aria-label="設定" onClick={openSettings}><Icon name="settings"/></button></aside>; }
function Explorer({ route, open, onResizeStart, onClose }) {
  const studio = model.config?.studio || {};
  const group = (title, name, values) => <details open><summary><Icon name={name}/>{title}<span>{values.length}</span></summary>{values.map((item) => <button className={route === item.href ? "selected" : ""} key={item.href} onClick={() => open(item.href)}><strong>{item.label}</strong>{item.meta && <small>{item.meta}</small>}</button>)}</details>;
  return <aside className="explorer">
    <div className="explorer-main">
      <div className="brand"><span>{studio.title || "SpecDock"}<small>{studio.subtitle || "ソース仕様に接続する開発Studio"}</small></span><button className="explorer-close" title="Explorerを閉じる" aria-label="Explorerを閉じる" onClick={onClose}><Icon name="panelLeft"/></button></div>
      <h2>エクスプローラー</h2>
      <button className={route === "overview" ? "selected overview-link" : "overview-link"} onClick={() => open("overview")}><Icon name="grid"/><span>概要</span></button>
      {group("ドキュメント", "doc", model.markdown.documents.map((x, i) => ({ href: `document/${i}`, label: x.title, meta: "" })))}
      {group("API", "api", model.openapi.operations.map((x, i) => ({ href: `api/${i}`, label: `${x.method} ${x.path}`, meta: "" })))}
      <details open><summary><Icon name="diagram"/>ER図</summary><button className={route === "er" ? "selected" : ""} onClick={() => open("er")}><strong>ER図</strong></button></details>
      {group("データモデル", "db", model.prisma.models.map((x, i) => ({ href: `database/${i}`, label: x.name, meta: "" })))}
      {group("データ型", "code", model.zod.schemas.map((x, i) => ({ href: `zod/${i}`, label: x.name, meta: "" })))}
    </div>
    <div className="explorer-footer"><button className={route === "settings" ? "selected" : ""} onClick={() => open("settings")} aria-label="設定を開く"><Icon name="settings"/><span>設定</span></button></div>
    <div className="explorer-resizer" onPointerDown={onResizeStart} role="separator" aria-label="Explorerの幅を変更"/>
  </aside>;
}
function Tabs({ pane, open, close, beginDrag, endDrag, showContextMenu }) { return <div className="editor-tabs">{pane.tabs.map((tab) => <div className={tab === pane.active ? "editor-tab active" : "editor-tab"} draggable onDragStart={(event) => beginDrag(event, tab)} onDragEnd={endDrag} onContextMenu={(event) => showContextMenu(event, tab)} key={tab}><button title={titleOf(tab)} onClick={() => open(tab)}>{titleOf(tab)}</button><button className="close-tab" aria-label={titleOf(tab) + "を閉じる"} onClick={(event) => { event.stopPropagation(); close(tab); }}>×</button></div>)}</div>; }
function TabContextMenu({ menu, onAction }) { const left = Math.min(menu.x, Math.max(8, window.innerWidth - 228)); const top = Math.min(menu.y, Math.max(8, window.innerHeight - 188)); return <div className="tab-context-menu" style={{ left, top }} onMouseDown={(event) => event.stopPropagation()}><button onClick={() => onAction("close")}>タブを閉じる</button><button onClick={() => onAction("others")} disabled={!menu.hasOthers}>他のタブを閉じる</button><button onClick={() => onAction("right")} disabled={!menu.hasRight}>右側のタブを閉じる</button><button onClick={() => onAction("all")}>すべてのタブを閉じる</button></div>; }
function PaneDivider({ containerRef, ratio, onChange, onDragStateChange }) {
  const pointerId = useRef(null);
  const move = (event) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (bounds) onChange(splitRatioFromPointer(event.clientX, bounds));
  };
  const stop = (event) => {
    if (pointerId.current !== event.pointerId) return;
    pointerId.current = null;
    onDragStateChange(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const handleKeyDown = (event) => {
    const delta = event.key === "ArrowLeft" ? -2 : event.key === "ArrowRight" ? 2 : 0;
    if (delta) onChange(normalizeSplitRatio(ratio + delta));
    else if (event.key === "Home") onChange(20);
    else if (event.key === "End") onChange(80);
    else return;
    event.preventDefault();
  };
  return <div className="pane-divider" role="separator" aria-label="左右ペインの幅を変更" aria-orientation="vertical" aria-valuemin={20} aria-valuemax={80} aria-valuenow={ratio} aria-valuetext={`左 ${ratio}%、右 ${100 - ratio}%`} tabIndex={0}
    onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); pointerId.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); onDragStateChange(true); move(event); }}
    onPointerMove={(event) => { if (pointerId.current === event.pointerId) move(event); }}
    onPointerUp={stop} onPointerCancel={stop}
    onLostPointerCapture={() => { pointerId.current = null; onDragStateChange(false); }}
    onKeyDown={handleKeyDown}/>;
}
function App() {
  const initialRoute = decodeURIComponent(location.hash.slice(1) || "overview");
  const [route, setRoute] = useState(initialRoute);
  const [panes, setPanes] = useState([{ id: 0, tabs: [initialRoute], active: initialRoute }]);
  const [activePane, setActivePane] = useState(0);
  const [split, setSplit] = useState("none");
  const [splitRatio, setSplitRatio] = useState(() => { try { return normalizeSplitRatio(window.localStorage.getItem(splitRatioStorageKey)); } catch { return 50; } });
  const [resizingPanes, setResizingPanes] = useState(false);
  const editorPanesRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [explorerOpen, setExplorerOpen] = useState(() => window.localStorage.getItem("specdock:explorer") !== "closed");
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [resizingExplorer, setResizingExplorer] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [appearance, setAppearance] = useState(() => { try { return loadAppearance(window.localStorage); } catch { return { ...defaultAppearance }; } });
  useEffect(() => { try { saveAppearance(window.localStorage, appearance); } catch {} }, [appearance]);
  useEffect(() => { try { window.localStorage.setItem(splitRatioStorageKey, String(splitRatio)); } catch {} }, [splitRatio]);
  useEffect(() => { const listener = () => setRoute(decodeURIComponent(location.hash.slice(1))); addEventListener("hashchange", listener); return () => removeEventListener("hashchange", listener); }, []);
  useEffect(() => { if (!contextMenu) return undefined; const dismiss = (event) => { if (!event.target.closest(".tab-context-menu")) setContextMenu(null); }; const escape = (event) => { if (event.key === "Escape") setContextMenu(null); }; window.addEventListener("mousedown", dismiss); window.addEventListener("keydown", escape); return () => { window.removeEventListener("mousedown", dismiss); window.removeEventListener("keydown", escape); }; }, [contextMenu]);
  useEffect(() => { if (!resizingExplorer) return undefined; const move = (event) => setExplorerWidth(Math.min(420, Math.max(160, event.clientX - 44))); const stop = () => setResizingExplorer(false); window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop, { once: true }); return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); }; }, [resizingExplorer]);
  const selectPane = (paneIndex) => { setActivePane(paneIndex); const next = panes[paneIndex]?.active || ""; setRoute(next); location.hash = next; };
  const open = (next, paneIndex = activePane) => { setPanes((items) => items.map((pane, index) => index === paneIndex ? { ...pane, tabs: pane.tabs.includes(next) ? pane.tabs : [...pane.tabs, next], active: next } : pane)); setActivePane(paneIndex); setRoute(next); location.hash = next; };
  const close = (tab, paneIndex = activePane) => { const pane = panes[paneIndex]; if (!pane) return; const tabs = pane.tabs.filter((item) => item !== tab); const next = pane.active === tab ? (tabs[tabs.length - 1] || null) : pane.active; if (!tabs.length && panes.length > 1) { setPanes((items) => items.filter((_, index) => index !== paneIndex)); setSplit("none"); const nextPane = paneIndex === 0 ? 0 : paneIndex - 1; setActivePane(nextPane); setRoute(panes[nextPane]?.active || ""); location.hash = panes[nextPane]?.active || ""; return; } setPanes((items) => items.map((item, index) => index === paneIndex ? { ...item, tabs, active: next } : item)); if (paneIndex === activePane && pane.active === tab) { setRoute(next || ""); location.hash = next || ""; } };
  const closeTabs = (tabsToClose, paneIndex = activePane) => { const pane = panes[paneIndex]; if (!pane) return; const tabs = pane.tabs.filter((item) => !tabsToClose.includes(item)); const next = pane.active && !tabsToClose.includes(pane.active) ? pane.active : (tabs[tabs.length - 1] || null); if (!tabs.length && panes.length > 1) { setPanes((items) => items.filter((_, index) => index !== paneIndex)); setSplit("none"); const nextPane = paneIndex === 0 ? 0 : paneIndex - 1; setActivePane(nextPane); setRoute(panes[nextPane]?.active || ""); location.hash = panes[nextPane]?.active || ""; return; } setPanes((items) => items.map((item, index) => index === paneIndex ? { ...item, tabs, active: next } : item)); if (paneIndex === activePane && tabsToClose.includes(pane.active)) { setRoute(next || ""); location.hash = next || ""; } };
  const moveTab = (tab, from, to) => { if (from === to) { open(tab, to); return; } const sourceWillClose = panes.length > 1 && panes[from]?.tabs.length === 1; const targetIndex = sourceWillClose && from < to ? to - 1 : to; setPanes((items) => { const next = items.map((pane) => ({ ...pane, tabs: [...pane.tabs] })); const source = next[from]; if (!source) return items; source.tabs = source.tabs.filter((item) => item !== tab); source.active = source.active === tab ? source.tabs[source.tabs.length - 1] : source.active; if (!source.tabs.length && next.length > 1) next.splice(from, 1); const target = next[targetIndex]; if (!target) return next; if (!target.tabs.includes(tab)) target.tabs.push(tab); target.active = tab; return next; }); const nextPane = sourceWillClose ? targetIndex : to; setSplit(sourceWillClose ? "none" : "horizontal"); setActivePane(nextPane); setRoute(tab); location.hash = tab; };
  const beginDrag = (event, tab, source = activePane) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", tab); setDragging({ tab, source }); };
  const updateDropTarget = (event, paneIndex) => { event.preventDefault(); if (!dragging) return; const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width; const edge = panes.length > 1 ? "pane" : (x < .2 ? "left" : x > .8 ? "right" : null); setDropTarget(edge ? { pane: paneIndex, edge } : null); };
  const dropTab = (event, target) => { event.preventDefault(); const data = event.dataTransfer.getData("text/plain"); const drag = dragging || { tab: data, source: activePane }; if (!drag?.tab) return; const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width; const edge = x < .2 || x > .8; if (edge && panes.length === 1) { setPanes((items) => items.map((pane, index) => { if (index !== drag.source) return pane; const tabs = pane.tabs.filter((item) => item !== drag.tab); return { ...pane, tabs, active: pane.active === drag.tab ? (tabs[tabs.length - 1] || null) : pane.active }; }).concat({ id: 1, tabs: [drag.tab], active: drag.tab })); setSplit("horizontal"); setActivePane(1); setRoute(drag.tab); location.hash = drag.tab; } else moveTab(drag.tab, drag.source, target); setDragging(null); setDropTarget(null); };
  const renderPage = (target, paneIndex) => { if (!target) return <p className="empty">このペインに開いているタブはありません。</p>; const { view, id } = parseRoute(target); const paneOpen = (next) => open(next, paneIndex); if (view === "overview") return <Overview model={model} open={paneOpen}/>; if (view === "settings") return <SettingsPage appearance={appearance} updateAppearance={(change) => setAppearance((current) => ({ ...current, ...change }))} resetAppearance={() => setAppearance({ ...defaultAppearance })}/>; if (view === "api") return <ApiPage id={id} open={paneOpen}/>; if (view === "database") return <DatabasePage id={id} open={paneOpen}/>; if (view === "zod") return <ZodPage id={id}/>; if (view === "document") return <DocumentPage id={id} open={paneOpen}/>; if (view === "er") return <ErPage/>; return <Overview model={model} open={paneOpen}/>; };
  const showContextMenu = (event, tab, paneIndex) => { event.preventDefault(); const pane = panes[paneIndex]; const tabIndex = pane?.tabs.indexOf(tab) ?? -1; setContextMenu({ x: event.clientX, y: event.clientY, tab, paneIndex, hasOthers: Boolean(pane && pane.tabs.length > 1), hasRight: Boolean(pane && tabIndex >= 0 && tabIndex < pane.tabs.length - 1) }); };
  const handleContextAction = (action) => { if (!contextMenu) return; const pane = panes[contextMenu.paneIndex]; if (!pane) return; const tabIndex = pane.tabs.indexOf(contextMenu.tab); if (action === "close") close(contextMenu.tab, contextMenu.paneIndex); if (action === "others") closeTabs(pane.tabs.filter((tab) => tab !== contextMenu.tab), contextMenu.paneIndex); if (action === "right") closeTabs(pane.tabs.slice(tabIndex + 1), contextMenu.paneIndex); if (action === "all") closeTabs(pane.tabs, contextMenu.paneIndex); setContextMenu(null); };
  const toggleExplorer = () => setExplorerOpen((value) => { const next = !value; window.localStorage.setItem("specdock:explorer", next ? "open" : "closed"); return next; });
  return <div className={`shell ${resizingExplorer ? "resizing-explorer" : ""} ${resizingPanes ? "resizing-panes" : ""} ${explorerOpen ? "" : "explorer-collapsed"}`} style={{ gridTemplateColumns: `${explorerOpen ? 0 : 44}px ${explorerOpen ? explorerWidth : 0}px minmax(0, 1fr)`, ...appearanceStyles(appearance) }}>
    {explorerOpen ? <span className="shell-placeholder" aria-hidden="true"/> : <ActivityRail toggleExplorer={toggleExplorer} openSettings={() => open("settings")} settingsActive={route === "settings"}/>}
    {explorerOpen ? <Explorer route={route} open={open} onClose={toggleExplorer} onResizeStart={(event) => { event.preventDefault(); setResizingExplorer(true); }}/> : <span className="shell-placeholder" aria-hidden="true"/>}
    <main className="workspace"><div ref={editorPanesRef} className={`editor-panes ${split !== "none" ? `split-${split}` : ""}`} style={split === "horizontal" ? { gridTemplateColumns: splitGridColumns(splitRatio) } : undefined}>
      {panes.map((pane, index) => {
        const target = dropTarget?.pane === index ? dropTarget.edge : "";
        return <React.Fragment key={pane.id}>
          {split === "horizontal" && index === 1 && <PaneDivider containerRef={editorPanesRef} ratio={splitRatio} onChange={setSplitRatio} onDragStateChange={setResizingPanes}/>}
          <section className={`${index === activePane ? "editor-pane active" : "editor-pane"} ${target ? `drop-${target}` : ""}`} onClick={() => selectPane(index)} onDragOver={(event) => updateDropTarget(event, index)} onDragLeave={() => setDropTarget(null)} onDrop={(event) => dropTab(event, index)}>
            <div className="pane-tabs"><Tabs pane={pane} open={(next) => open(next, index)} close={(tab) => close(tab, index)} beginDrag={(event, tab) => beginDrag(event, tab, index)} endDrag={() => { setDragging(null); setDropTarget(null); }} showContextMenu={(event, tab) => showContextMenu(event, tab, index)}/><span className="drop-hint">左右の端へドロップして分割</span></div>
            <div className="pane-content">{renderPage(pane.active, index)}</div>
          </section>
        </React.Fragment>;
      })}
    </div></main>
    {contextMenu && <TabContextMenu menu={contextMenu} onAction={handleContextAction}/>}
  </div>;
}
const root = createRoot(document.getElementById("root"));
fetch(new URL("./model.json", document.baseURI))
  .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
  .then((data) => { model = data; root.render(<App/>); })
  .catch(() => root.render(<p role="alert" className="empty">仕様データを読み込めませんでした。配布ファイルとアクセス設定を確認してください。</p>));
