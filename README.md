# spec-dock

Prisma・Zod・OpenAPI・Markdownを、ひとつの開発プロジェクトの仕様として横断的に閲覧・検証するためのOSSです。

## 方針

- 独自DSLを新設せず、既存OSSと標準的なソース形式を正本にする
- DB定義はPrisma Schemaを正本にする
- 入出力の実行時検証はZodを正本にする
- API公開契約はZodから生成したOpenAPIを成果物にする
- 業務背景・要求・判断記録はMarkdownで管理する
- Studioは仕様を編集する場所ではなく、ソース仕様を発見・理解・検証する場所から始める

## Naming

```text
Product: SpecDock
Repository: spec-dock
CLI: specdock
Tagline: Source-anchored specifications.
```

SpecDockは、Prisma・Zod・OpenAPIなど既存の仕様ソースに接続する補助OSSです。`Dock`は、異なるソースを接続・集約し、チームが仕様を確認する場所を表します。

## MVP

```text
既存プロジェクト
  ├─ prisma/schema.prisma
  ├─ src/schemas/**/*.ts
  ├─ src/api/**/*.ts
  └─ docs/**/*.md
          │
          ▼
      spec-dock
          ├─ API一覧・詳細
          ├─ DB定義・ER図
          ├─ データ型
          ├─ Markdown文書
          └─ 不整合レポート
```

最初のCLIは次の3コマンドに限定します。

```sh
specdock scan   # ソースを解析して中間JSONを生成
specdock check  # ソース間の不整合を検出
specdock build  # Studioが読む成果物を生成
specdock serve  # ビルドしてStudioを起動
specdock dev    # Studioを起動し、ソース変更を監視
```

仕様は[specs/](specs/README.md)、アーキテクチャは[docs/architecture/](docs/architecture/README.md)、設計判断は[docs/adr/](docs/adr/README.md)、開発手順は[Development guide](docs/guides/development-loop.md)、横断ルールは[rules/](rules/README.md)に分けて管理します。

AIエージェントを利用した開発体制は[Agent development loop](docs/guides/agent-loop.md)、共通原則は[CONSTITUTION.md](CONSTITUTION.md)を参照してください。

## 開発

```sh
npm test
npm run scan -- --project examples/order-management
npm run check -- --project examples/order-management --format json
npm run build -- --project examples/order-management
npm run studio -- --project examples/order-management --port 4173
npm run dev -- --project examples/order-management --port 4173
```

`dev`はPrisma・Zod・OpenAPI・Markdownを変更するたびに再スキャン・再ビルドします。StudioにはOverview、API operations、データモデル、データ型、ER diagram、Documentsのビューがあります。

生成物は対象プロジェクトの`.specdock/`に出力されます。
