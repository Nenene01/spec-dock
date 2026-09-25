# Development loop

SpecDockの開発ループは、次の順序を固定します。

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

## テスト区分

- `test/unit/`: Readerや診断関数の単体テスト。外部I/Oを使わない
- `test/`: CLIの統合テスト。サンプルプロジェクトを実際に読み込む
- 将来の`test/e2e/`: Studioの画面遷移・検索・表示をブラウザで検証する

CIでは、少なくとも`npm test`とサンプルの`check`を必須にします。

## 変更時の判断

- Readerの変更: 中間モデルの後方互換とunit testを確認する
- 中間モデルの変更: Studio Rendererと生成物のテストを更新する
- CLI契約の変更: READMEとCIの利用例を同時に更新する
- UIだけの変更: Reader・診断には変更を波及させない
