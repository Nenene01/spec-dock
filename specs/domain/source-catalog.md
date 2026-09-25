# Source catalog

SpecDockは、複数のソースを同時に編集するDSLではない。既存プロジェクトの正本と派生物の関係を発見・検証し、非エンジニアにも参照可能にする。

| 領域 | 正本 | SpecDockでの扱い |
| --- | --- | --- |
| DB構造・リレーション | Prisma Schema | 読み込み、ER図・一覧を生成 |
| API契約 | OpenAPIまたはZodの一方 | 選択したモードの正本を検証 |
| 実行時入力検証 | Zod | API契約との整合を検証 |
| 業務背景・要求・用語 | Markdown | 説明資料として表示 |
| 閲覧画面・ER図 | SpecDock生成物 | 手編集しない |

## API契約モード

```text
contract-first
  OpenAPIが正本
  Zodは実装側の検証スキーマ

code-first
  Zodが正本
  OpenAPIは生成物
```

OpenAPIとZodを独立した正本として編集する運用は採用しない。

## Markdownの境界

Markdownは、業務背景、受け入れ条件、ADR、用語集などの説明に使う。API、DB、画面項目の構造化情報をMarkdownへ重複して記述しない。
