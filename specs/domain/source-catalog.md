# Source catalog

SpecDockは、複数のソースを同時に編集するDSLではない。既存プロジェクトの正本と派生物の関係を発見・検証し、非エンジニアにも参照可能にする。

| 領域 | 正本 | SpecDockでの扱い |
| --- | --- | --- |
| DB構造・リレーション | Prisma Schema | 読み込み、ER図・一覧を生成 |
| API契約 | OpenAPIまたはZodの一方 | 選択したモードに応じて基本診断を行う |
| 実行時入力検証 | Zod | データ型を閲覧し、code-firstでは参照名を診断する |
| 業務背景・要求・用語 | Markdown | 説明資料として表示 |
| 閲覧画面・ER図 | SpecDock生成物 | 手編集しない |

## API契約モード

プロジェクトルートの`spec-dock.config.json`で、API契約モードを明示する。

```text
contract-first
  OpenAPIが正本
  Zodは実装側の検証スキーマ

code-first
  Zodが正本
  OpenAPIは生成物
```

OpenAPIとZodを独立した正本として編集する運用は採用しない。

`code-first`のOpenAPI生成はプロジェクト側で行う。SpecDockは生成しない。現行の診断は型定義の完全一致を保証しない。

## 設定と検出範囲

`init`はソース候補を探して`spec-dock.config.json`を作る。現行の`scan`はプロジェクト配下の対象拡張子・ファイル名を探索し、`sources`の指定はStudioの「参照元」表示に使う。`sources`で解析対象を厳密に絞り込む機能はまだない。`node_modules`・`.git`・`.specdock`・`dist`は探索から除く。

## Studio表示設定

Explorerのブランド名とサブタイトルは、プロジェクトルートの`spec-dock.config.json`で設定する。

```json
{
  "studio": {
    "title": "SpecDock",
    "subtitle": "ソース仕様に接続する開発Studio"
  }
}
```

未設定の場合は、上記の既定値を表示する。

## Markdownの境界

Markdownは、業務背景、受け入れ条件、APIごとの処理や例、用語などの説明に使う。人が読むための表や例を含めてもよいが、APIの機械可読な契約はOpenAPI、論理データモデルはPrismaを正本とする。内容が食い違う場合は正本を確認し、説明文を更新する。

## DocumentとAPIの関連付け

DocumentからAPIへ辿れることを重視し、関連付けには2種類の情報を使う。

- フロントマターの`api.method`と`api.path`、または本文の`GET /orders`のような表記: DocumentとAPIを関連付けるキー
- `[OpenAPI contract](...)`のようなMarkdownリンク: 正本ファイルへの参照元を明示し、参照切れを検証するリンク

したがって、OpenAPIへのMarkdownリンクがなくてもAPIのmethod/pathがあれば関連APIを表示できる。一方、どちらもないDocumentは、業務Documentとして表示し、特定APIとの自動関連付けは行わない。`operationId`だけによる関連付けは未対応。
