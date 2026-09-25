import React from "react";

function EntryCard({ label, count, description, example, onOpen }) {
  return <article className="reader-entry">
    <div className="reader-entry-heading"><h3>{label}</h3><span>{count}件</span></div>
    <p>{description}</p>
    <button onClick={onOpen} disabled={!onOpen}>
      <span>{example || "項目はまだありません"}</span><span aria-hidden="true">→</span>
    </button>
  </article>;
}

export default function Overview({ model, open }) {
  const documents = model.markdown.documents;
  const operations = model.openapi.operations;
  const schemas = model.zod.schemas;
  const models = model.prisma.models;
  const businessDocumentIndex = documents.findIndex((document) => !document.relatedOperations?.length);
  const documentIndex = businessDocumentIndex >= 0 ? businessDocumentIndex : 0;
  const sources = [
    ["Prisma", model.sourceCatalog?.prisma || model.prisma.files],
    ["OpenAPI", model.sourceCatalog?.openapi || model.openapi.files],
    ["Zod", model.sourceCatalog?.zod || model.zod.files],
    ["Documents", model.sourceCatalog?.documents || model.markdown.files],
  ];

  return <div className="reader-overview">
    <header className="reader-intro">
      <span className="eyebrow">仕様ガイド</span>
      <h1>知りたいことから、仕様をたどる。</h1>
      <p>業務の説明、APIの動き、データの構造をひとつの場所で確認できます。</p>
    </header>
    <div className="reader-section-title"><h2>どこから見ますか？</h2><p>項目を選ぶと、その仕様がタブで開きます。</p></div>
    <div className="reader-entries">
      <EntryCard label="業務を理解する" count={documents.length} description="目的やルールをドキュメントで確認" example={documents[documentIndex]?.title} onOpen={documents.length ? () => open(`document/${documentIndex}`) : null}/>
      <EntryCard label="APIの動きを見る" count={operations.length} description="入力、出力、認証やエラーを確認" example={operations[0] && `${operations[0].method} ${operations[0].path}`} onOpen={operations.length ? () => open("api/0") : null}/>
      <EntryCard label="データの関係を見る" count={models.length} description="データモデルと関連をER図で確認" example={models.length ? "ER図を開く" : ""} onOpen={models.length ? () => open("er") : null}/>
      <EntryCard label="項目の制約を見る" count={schemas.length} description="入出力の型とバリデーションを確認" example={schemas[0]?.name} onOpen={schemas.length ? () => open("zod/0") : null}/>
    </div>
    <details className="reader-sources">
      <summary>参照元のファイルを確認</summary>
      <p>画面の内容は、以下のソースから生成しています。</p>
      <div className="source-catalog">{sources.map(([label, entries]) => <div className="source-catalog-row" key={label}><span>{label}</span><div>{entries.map((entry) => <code key={entry}>{entry}</code>)}</div></div>)}</div>
    </details>
  </div>;
}
