# SpecDockへの貢献

SpecDockへの関心をありがとうございます。不具合の再現例、説明の分かりにくい箇所、Studioの操作性、サンプルやテストの改善も歓迎します。小さな変更から参加できます。

## Issueを作るとき

- 不具合は、期待した結果・実際の結果・再現手順・使用したコマンドを記載してください。可能なら最小構成の `spec-dock.config.json` と該当するPrisma・OpenAPI・Zod・Markdownの例を添えてください。
- 新しいソース形式、CLIオプション、Studioの振る舞いを提案するときは、解きたい問題と利用例を先にIssueで共有してください。
- 実案件の仕様、顧客情報、トークン、接続文字列、非公開URLをIssue・PR・スクリーンショットへ含めないでください。再現例は架空のデータに置き換えてください。

誤字やリンク修正など、小さく独立した変更はIssueなしのPRでも構いません。

## 開発環境

Node.js 20.19以上とnpmを使用します。コマンドはリポジトリルートで実行してください。

```sh
git clone https://github.com/Nenene01/spec-dock.git
cd spec-dock
npm ci
npm run studio -- --project examples/facility-admin --port 4173
```

ブラウザで <http://localhost:4173/> を開けます。サンプルの内容は[施設予約管理サンプル](examples/facility-admin/README.md)を参照してください。

## どこを変更するか

| 場所 | 役割 |
| --- | --- |
| `cli/src/` | `init`・`scan`・`check`・`build`・`serve`・`dev` |
| `packages/readers/src/` | Prisma・OpenAPI・Zod・Markdownの読み込み |
| `packages/core/src/` | 設定、中間モデル、診断 |
| `packages/studio/` | Studioの画面とビルド |
| `examples/` | 公開可能な架空のサンプル |
| `test/` | 自動テスト |

機能の受け入れ条件は[specs/](specs/README.md)、構成は[architecture](docs/architecture/README.md)、設計判断は[ADR](docs/adr/README.md)、実装規約は[rules/](rules/README.md)にあります。[CONSTITUTION.md](CONSTITUTION.md)と[AGENTS.md](AGENTS.md)も変更前に確認してください。詳細な開発ループは[開発ガイド](docs/guides/development-loop.md)にあります。

## 変更と検証

1. 変更範囲を一つの課題に絞り、振る舞いが変わる場合は対応するSpec・サンプル・文書も更新してください。新しい独自DSLや正本の二重管理を増やす変更は、事前にIssueで相談してください。
2. 不具合修正には再現テストを追加してください。Readerや中間モデルを変える場合は、Studio表示と既存サンプルへの影響も確認してください。
3. PR前に、少なくとも次を実行してください。

```sh
npm run governance:check
npm test
npm run check -- --project examples/order-management --format json
npm run check -- --project examples/facility-admin --format json
```

Studioやビルドに変更がある場合は、加えて `npm run build -- --project examples/facility-admin` を実行し、対象画面をブラウザで確認してください。CLIの使用方法を変えた場合はREADMEのコマンド例も更新してください。

## Pull Request

- 変更の目的、関連IssueやSpec、確認したコマンドと結果を記載してください。[PRテンプレート](.github/pull_request_template.md)の確認項目も埋めてください。
- UI変更では、変更前後の画面や操作手順を示してください。スクリーンショットは機密情報を含まないサンプルで撮影してください。
- 未確認事項や互換性への影響があれば明記してください。レビュー中の指摘に応じて、必要なテスト・文書を同じPRで更新してください。

GitHub Actionsではガバナンスチェック、テスト、サンプルの `check` を実行します。ローカルで失敗する場合は、失敗内容をPRに記載してください。
