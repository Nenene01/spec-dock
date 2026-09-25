# Specifications

このディレクトリは、SpecDockが「何を満たすべきか」を定義する正本です。

## 配置ルール

- `features/`: ユーザーや利用プロジェクトから見た機能仕様
- `domain/`: SpecDockが扱う仕様ソースと診断対象の意味

仕様には、目的、利用者、入力、期待する結果、受け入れ条件を記載します。
実装構造、依存方向、命名規則はここでは扱わず、`docs/architecture/`または`rules/`に記載します。

## 判断基準

- 今回の実装にだけ必要な判断は、対象FeatureのSpecに残す
- 将来も「何が正しいか」を判断する基準は、SpecDockが参照できるSpecとして残す
- 仕様から生成・検証できるものは、手書きの派生文書にせずソース仕様を正本にする

## 関連文書

- [MVP feature specification](features/mvp.md)
- [Studio閲覧体験](features/studio-reader-experience.md)
- [Source catalog](domain/source-catalog.md)
- [Architecture](../docs/architecture/README.md)
- [Development guide](../docs/guides/development-loop.md)
