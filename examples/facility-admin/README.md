# 施設予約管理サンプル

架空の複数組織向け施設予約サービスを運営する管理画面の仕様サンプルです。実案件の名称、識別子、文章、顧客情報、URL、SQL、秘密情報は含めていません。設計資料からは、仕様書の観点と画面で確認すべき項目だけを抽出し、モデル・API・業務ルールを新たに作成しました。

## 見どころ

- `specs/features/`：業務概要とAPIごとの詳細設計書。目的、入出力、検証、エラー、処理、トランザクションを分けて記載
- `openapi.yaml`：HTTP契約。認証、ヘッダー、検索条件、上限、状態のenum、成功・失敗時の型を定義
- `prisma/schema.prisma`：組織、管理担当者、施設、区画、予約、お知らせ、取込ジョブ、監査履歴の論理モデル
- `src/schemas/`：入力値のZod検証例

Prisma Schemaは論理モデルです。PostgreSQL固有のCHECK・RLS・トリガーなどの実テーブル定義は、このサンプルでは実装しません。業務ルールのうちDBで担保されないものは各API設計書に明記します。

## Studioで見る

リポジトリルートで以下を実行します。

```sh
npm run check -- --project examples/facility-admin --format json
npm run build -- --project examples/facility-admin
npm run studio -- --project examples/facility-admin --port 4177
```

このサンプルは仕様閲覧用であり、APIサーバーやDBへ接続する実装は含みません。
