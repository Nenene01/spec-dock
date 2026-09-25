# Ecosystem and migration

## 採用候補

MVPでは、既存エコシステムがあり、利用者が導入しやすい形式・OSSを優先する。

- Prisma: Schema解析、DBモデル、Generator基盤
- Zod: 実行時検証とTypeScript型推論
- `@asteasolutions/zod-to-openapi`: ZodからOpenAPIを生成
- `@apidevtools/swagger-parser`: OpenAPIのYAML/JSON Parseと構造化
- `prisma-markdown`: PrismaからMarkdown・Mermaid ERDを生成する比較・補助候補

次の候補は、対応バージョン、ライセンス、依存関係、保守状況を確認してから採用する。

- `zod-prisma-types`: PrismaモデルからZodを生成
- `prisma-erd-generator`: ERD生成。ただしMVPではPuppeteer依存を避け、Mermaid文字列を優先する
- Hekireki: Studio UXと統合アイデアの参考。中核依存にはしない

採用した依存は、ロックファイルと第三者ライセンス一覧で追跡する。

## 旧リポジトリからの移行

`xmls`、`ddml`、`deml`、`usml`は、思想とテストケースを移行元として扱う。独自DSLの仕様そのものをSpecDockへそのまま移植しない。

移行は次の順序で行う。

1. 各リポジトリの最終状態にタグを付ける
2. READMEにSpecDockへの移行方針を追記する
3. 必要に応じてGitHubリポジトリをArchive化する
4. 有用なサンプルを`spec-dock/examples`へ移植する
5. 必要な検証ロジックだけを再実装する
