# SpecDock MVP: 現行範囲

## 目的

既存のTypeScriptプロジェクトを読み込むだけで、非エンジニアもDB・API・業務文書を参照できる最小エコシステムを提供する。

## 対象入力

- Prisma Schema
- Zod Schema
- OpenAPI成果物
- Markdown文書

## 提供機能

1. ローカルのプロジェクトディレクトリを読み込む（Gitは必須ではない）
2. Prismaのモデルとリレーションを一覧表示する
3. APIのRequest/Responseを一覧表示する
4. Zodスキーマを一覧表示する
5. ER図を表示する
6. Markdownの業務文書を表示する
7. ソース間の基本的な不整合を診断する
8. CI向けにJSON診断を出力する
9. StudioでDocumentから対応APIへ移動し、タブと左右ペインで並べて読む
10. API契約モードをプロジェクト設定で明示する

横断検索は現行MVPに含めない。必要性と導線は[Studio改善タスク](../../docs/guides/studio-development-tasks.md)で検討する。

## CLI受け入れ条件

```sh
npm run specdock -- init --project /path/to/new-project
npm run scan -- --project examples/facility-admin
npm run check -- --project examples/facility-admin --format json
npm run build -- --project examples/facility-admin
```

`init`は対話的に設定ファイルを作るため、既存サンプルではなく新規の一時プロジェクトで確認する。その他のコマンドはサンプルに対して再現可能に実行できること。`check`は毎回ソースを再スキャンし、エラーがあれば終了コード`1`、警告のみなら`0`を返す。

## 診断コード

```text
E001  Prisma Schemaを検出できない
E002  OpenAPIとZodの両方を検出できない
E003  code-firstでOpenAPIの参照先Zodスキーマが存在しない
W001  説明のないモデルがある
W002  APIから参照されていないZodスキーマがある（code-first）
W003  Markdownのローカルリンク先が見つからない
E004  API契約モードが不正である
E005  OpenAPIを解析できない
```

診断コードの意味は[`diagnostics.mjs`](../../packages/core/src/diagnostics.mjs)とテストで検証する。フィールド単位の完全な型整合チェックは未実装。

## 対象外

- マルチユーザー編集
- クラウド上の正本管理
- MCPサーバ
- 独自DSL
- DBへの直接編集
- 完全な業務要件モデリング
- 複数言語・複数ORM対応
