# SpecDock MVP

## 目的

既存のTypeScriptプロジェクトを読み込むだけで、非エンジニアもDB・API・業務文書を参照できる最小エコシステムを提供する。

## 対象入力

- Prisma Schema
- Zod Schema
- OpenAPI成果物
- Markdown文書

## 提供機能

1. ローカルGitプロジェクトを読み込む
2. Prismaのモデルとリレーションを一覧表示する
3. APIのRequest/Responseを一覧表示する
4. Zodスキーマを一覧表示する
5. ER図を表示する
6. Markdownの業務文書を表示する
7. ソース間の基本的な不整合を診断する
8. CI向けにJSON診断を出力する
9. Studioで検索・相互参照する
10. API契約モードをプロジェクト設定で明示する

## CLI受け入れ条件

```sh
specdock scan --project . --out .specdock
specdock check --project . --format human
specdock check --project . --format json
specdock build --project . --out .specdock/site
```

サンプルプロジェクトに対して、上記コマンドが再現可能に実行できること。

## 診断コード

```text
E001  Prisma Schemaを検出できない
E002  OpenAPIで参照されたスキーマが存在しない
E003  ZodとOpenAPIの型定義が矛盾している
W001  説明のないモデル・フィールドがある
W002  APIから参照されないモデルがある
W003  文書から参照された対象が見つからない
E004  API契約モードが不正である
```

## 対象外

- マルチユーザー編集
- クラウド上の正本管理
- MCPサーバ
- 独自DSL
- DBへの直接編集
- 完全な業務要件モデリング
- 複数言語・複数ORM対応
