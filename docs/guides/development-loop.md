# Development guide: development loop

この文書は、SpecDockを変更・検証・運用する手順を定義します。実装時に常に守る規約は`rules/`、機能が満たすべき条件は`specs/`を参照してください。

AIへタスクを依頼するときの文書選択は、[AI context guide](ai-context.md)を参照してください。

## 開発ループ

```text
source change
  ↓
scan（中間モデル生成）
  ↓
check（診断・契約整合）
  ↓
build（Studio・ER図生成）
  ↓
serve / dev（閲覧・変更監視）
```

## コマンド

```sh
npm test
npm run scan -- --project examples/order-management
npm run check -- --project examples/order-management --format json
npm run build -- --project examples/order-management
npm run dev -- --project examples/order-management --port 4175
```

## 変更時の確認

- Readerの変更: 中間モデルの互換性とunit testを確認する
- 中間モデルの変更: Studio Rendererと生成物のテストを更新する
- CLI契約の変更: READMEとCIの利用例を同時に更新する
- UIだけの変更: Reader・診断へ不要な変更を波及させない

## テスト区分

- `test/unit/`: Readerや診断関数の単体テスト。外部I/Oを使わない
- `test/`: CLIの統合テスト。サンプルプロジェクトを実際に読み込む
- `test/e2e/`: Studioの画面遷移・検索・表示をブラウザで検証する（将来）
