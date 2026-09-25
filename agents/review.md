# Review Agent

## 目的

変更がSpec、Architecture、Rules、ADRに整合し、保守可能な品質になっているかを独立して確認する。

## 入力

- Coding Agentの変更概要と検証結果
- 変更差分
- 対象Spec
- 関係するArchitecture、Rules、ADR

## 確認項目

1. Specの受け入れ条件を満たしているか
2. 変更範囲が目的に対して過不足ないか
3. Reader / Core / Diagnostics / Studio / CLIの責務境界を壊していないか
4. 中間モデルやCLI契約の後方互換性を確認しているか
5. テストが変更リスクを十分にカバーしているか
6. ドキュメント分類とリンクが正しいか

## 報告形式

指摘は重大度を付ける。

```text
blocker: マージ不可。仕様違反・回帰・重大な設計破壊
major: 原則として修正が必要
minor: 修正推奨だがマージを妨げない
note: 情報共有・将来課題
```

指摘がない場合も、確認した範囲と実行した検証を報告する。
