# Source of truth architecture

SpecDockは、複数の仕様ソースを同時に編集するためのDSLではありません。既存プロジェクトの正本と派生物を接続し、閲覧・検証するための補助OSSです。

正本の種類とプロダクト上の意味は、[Source catalog](../../specs/domain/source-catalog.md)で定義します。

## 生成境界

```text
Prisma / Zod / OpenAPI / Markdown
                 ↓
              Readers
                 ↓
          SpecDock intermediate model
                 ↓
       Diagnostics / Studio / Mermaid
```

StudioやER図は生成物であり、手編集しません。ソース変更後に再スキャン・再ビルドします。

## APIの二重管理を禁止する

APIでは次のどちらか一方だけを正本とします。

- `contract-first`: OpenAPIが正本、Zodは実装側の検証スキーマ
- `code-first`: Zodが正本、OpenAPIは生成物

この選択は、将来のプロジェクト設定で明示します。
