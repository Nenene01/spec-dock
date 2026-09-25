# SpecDock Phase 0計画

## 目的

独自仕様言語の普及を前提にせず、既存のTypeScriptプロジェクトを読み込むだけで、非エンジニアもDB・API・業務文書を参照できる最小エコシステムを、SpecDockとして定義する。

## 正本の責務

| 領域 | 正本 | Studioでの表示 |
| --- | --- | --- |
| DB・リレーション | `schema.prisma` | テーブル一覧、カラム、ER図 |
| API入出力 | Zod Schema | Request/Response、説明、型 |
| API公開契約 | Zodから生成したOpenAPI | API一覧、HTTP仕様、サンプル |
| 業務背景・要求 | Markdown | 文書、決定事項、用語集 |
| 実装 | アプリケーションコード | 参照元リンク、検証対象 |

## 採用候補OSS

### MVPで優先

- Prisma: Schema解析、DBモデル、Generator基盤
- Zod: 実行時検証とTypeScript型推論
- `@asteasolutions/zod-to-openapi`: ZodからOpenAPIを生成
- `prisma-markdown`: PrismaからMarkdown・Mermaid ERDを生成する比較・補助候補

### 採用を保留

- `zod-prisma-types`: PrismaモデルからZodを生成できるが、Prismaの対応バージョンとAPI境界用スキーマの扱いを検証してから判断する
- `prisma-erd-generator`: ERD生成は有力だが、Puppeteer依存がMVPの実行環境を重くするため、まずMermaid文字列を直接扱う
- Hekireki: StudioのUXと統合アイデアを参考にする。中核依存にはせず、必要な機能を検証してから判断する

すべての依存は、採用時点のライセンス、依存ライセンス、対応バージョン、最終更新状況をロックファイルと第三者ライセンス一覧に記録する。

## MVPの範囲

### 含めるもの

1. ローカルGitプロジェクトの読込み
2. Prisma Schemaの解析
3. Zod Schemaの解析
4. OpenAPI成果物の読込み・生成
5. Markdown文書の読込み
6. API・DB・文書の検索と相互リンク
7. ER図表示
8. ソース間の基本的な不整合検出
9. CI向けのJSON診断出力

### 含めないもの

- マルチユーザー編集
- クラウド上の正本管理
- MCPサーバ
- 独自DSL
- DBへの直接編集
- 完全な業務要件モデリング
- 複数言語・複数ORM対応

## CLI契約案

```sh
specdock scan --project . --out .specdock
specdock check --project . --format human
specdock check --project . --format json
specdock build --project . --out .specdock/site
```

診断には安定したコードを付けます。

```text
E001  Prisma Schemaを検出できない
E002  OpenAPIで参照されたスキーマが存在しない
E003  ZodとOpenAPIの型定義が矛盾している
W001  説明のないモデル・フィールドがある
W002  APIから参照されないモデルがある
W003  文書から参照された対象が見つからない
```

## 初期ディレクトリ案

```text
spec-dock/
├── apps/studio/
├── packages/scanner/
├── packages/prisma-reader/
├── packages/zod-reader/
├── packages/openapi-builder/
├── packages/consistency-checker/
├── cli/
├── examples/
├── docs/
└── README.md
```

TypeScriptの単一モノレポとして始め、解析結果の中間形式を最初に安定させる。UIは中間形式に依存し、PrismaやZodの実装詳細を直接参照しない。

## 完了条件

次のサンプルプロジェクトを対象に、以下が実行できることをPhase 0の完了条件とする。

```sh
specdock scan
specdock check
specdock build
```

- Prismaのモデルとリレーションを一覧表示できる
- APIのRequest/Responseを一覧表示できる
- ER図を表示できる
- Markdownの業務文書を表示できる
- 未説明項目と参照切れを診断できる
- 生成物をCIで再現できる

## 旧リポジトリの扱い

`xmls`、`ddml`、`deml`、`usml`はすぐに削除せず、SpecDockへの移行元として次の順で扱う。

1. 最終状態にタグを付ける
2. READMEに`spec-dock`への移行方針を追記する
3. GitHubリポジトリをArchive化する
4. サンプルを`spec-dock/examples`へ移植する
5. 必要な検証ロジックだけを再実装する

移行対象は思想とテストケースを中心とし、独自DSLの仕様そのものは原則として移植しない。
