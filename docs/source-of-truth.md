# Source of truth

SpecDockは複数の仕様ソースを同時に編集するためのDSLではありません。既存プロジェクトの正本と派生物の関係を検出し、閲覧・検証するための補助OSSです。

## 責務

| 領域 | 正本 | SpecDockの扱い |
| --- | --- | --- |
| DB構造・リレーション | Prisma Schema | 読み込み、ER図・一覧を生成 |
| API契約 | OpenAPIまたはZodの一方 | `contract-first` / `code-first`を将来判定 |
| 実行時入力検証 | Zod | API契約との整合を検証 |
| 業務背景・判断・用語 | Markdown | 構造化契約ではなく説明資料として表示 |
| 閲覧画面・ER図 | SpecDock生成物 | 手編集しない |

## APIの二重管理を禁止する

次のどちらか一方を採用します。

```text
contract-first
  OpenAPIが正本
  Zodは実装側の検証スキーマ

code-first
  Zodが正本
  OpenAPIは生成物
```

OpenAPIとZodを独立した正本として編集する運用は採用しません。将来の`check`では、正本モードと派生方向を明示できる設定を設けます。

## Markdownの境界

人が書くMarkdownは、業務背景・受け入れ条件・ADR・用語集などの説明資料に限定します。API、DB、画面項目の構造化情報をMarkdownに重複して記述しません。

```text
docs/requirements/  人が管理する業務背景・要求
docs/decisions/     人が管理する判断記録
.specdock/site/     SpecDockが生成する閲覧画面
```

## 設計原則との関係

この整理は、`dev-foundation-notes`の「定義 → 検証 → 生成」と、API契約を二重管理しない方針をSpecDock向けに適用したものです。
