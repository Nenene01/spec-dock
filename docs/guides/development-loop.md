# Development guide: development loop

この文書は、SpecDockを変更・検証・運用する手順を定義します。実装時に常に守る規約は`rules/`、機能が満たすべき条件は`specs/`を参照してください。

AIへタスクを依頼するときの文書選択は、[AI context guide](ai-context.md)を参照してください。

Studioの未完了タスクは[Studio改善タスク](studio-development-tasks.md)を参照してください。現行機能の要件は[Studio閲覧体験](../../specs/features/studio-reader-experience.md)を正本とします。

## 開発ループ

```text
source change
  ├─ check（再スキャン + 診断）
  └─ build / serve / dev（再スキャン + Studio・ER図生成）
```

`scan`だけを実行して中間モデルを確認することもできます。`check`が既存の`scan.json`だけを読むことはありません。

## コマンド

```sh
npm test
npm run governance:check
npm run check -- --project examples/order-management --format json
npm run check -- --project examples/facility-admin --format json
npm run build -- --project examples/facility-admin
npm run dev -- --project examples/facility-admin --port 4173
```

`check`は毎回ソースを再スキャンし、`.specdock/scan.json`を更新します。CIは両サンプルの診断と施設予約サンプルのビルドまで実行します。上記コマンドはリポジトリルートで実行してください。

## 変更時の確認

- Readerの変更: 中間モデルの互換性とunit testを確認する
- 中間モデルの変更: Studio Rendererと生成物のテストを更新する
- CLI契約の変更: READMEとCIの利用例を同時に更新する
- UIだけの変更: Reader・診断へ不要な変更を波及させない

## テスト区分

- `test/unit/`: Readerや診断関数の単体テスト。外部I/Oを使わない
- `test/`: CLI・Studioの単体/統合テスト。書き込みが必要な場合は一時ディレクトリにfixtureを複製する
- ブラウザE2Eと視覚回帰は未導入。UI変更時は施設予約サンプルを手動で確認し、結果をPRに記録する
