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

StudioやER図は生成物であり、手編集しません。`check`は実行ごとに再スキャンします。`build`・`serve`・`dev`もソースから再生成します。

## 配布境界

`build`は対象プロジェクトの`.specdock/site/`に静的なStudioを生成します。HTML、CSS、JSとその分割チャンク、`model.json`、`schema.mmd`、faviconを同じ配布単位として扱います。HTMLからの参照は相対パスで、閲覧時にCDNを要求しません。ブラウザが読み込む`model.json`には解析した仕様やMarkdown本文が含まれます。

Studioは閲覧用であり、認証・認可・公開範囲の制御は行いません。閉域配信や外部共有では、配布単位全体に対するアクセス制御をホスト側で設けます。配置・確認手順は[ホスティングガイド](../guides/hosting.md)、利用者から見た条件は[閉域共有の仕様](../../specs/features/offline-studio.md)を参照してください。

## APIの二重管理を禁止する

APIでは次のどちらか一方だけを正本とします。

- `contract-first`: OpenAPIが正本、Zodは実装側の検証スキーマ
- `code-first`: Zodが正本、OpenAPIはプロジェクト側の別ツールで生成する成果物

この選択は`spec-dock.config.json`の`api.mode`で明示します。SpecDock自身はOpenAPIを生成しません。現状の診断はソースの有無・解析エラー・参照名などの基本的な確認であり、OpenAPIとZodのフィールド値まで完全に照合するものではありません。
