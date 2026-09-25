# Agent development loop

## 基本フロー

```text
Task + Spec
    ↓
Coding Agent
    ↓ 変更差分・テスト結果
Review Agent
    ↓ レビュー指摘・修正確認
Security Agent
    ↓ セキュリティ判定
Merge decision
```

## 役割の境界

| 役割 | 主な責務 | 完了条件 |
| --- | --- | --- |
| Coding Agent | 実装・テスト・生成物確認 | Specの受け入れ条件と検証結果が報告されている |
| Review Agent | 仕様・設計・品質レビュー | blocker / majorの未解決指摘がない |
| Security Agent | セキュリティ・依存関係レビュー | critical / highの未解決リスクがない |

## 実行手順

### 1. タスク準備

Coding Agentへ、対象Spec、期待する成果物、対象外、関連ADRを渡す。全ドキュメントを無差別に渡さない。

### 2. 実装

Coding Agentは、変更前にリポジトリを確認し、実装後に`npm test`と対象プロジェクトの`check`を実行する。UIや生成処理を変更した場合は`build`も実行する。

### 3. レビュー

Review Agentは変更差分を独立して読み、Spec・Architecture・Rulesとの整合性を確認する。指摘は`blocker`、`major`、`minor`、`note`で分類する。

### 4. セキュリティ確認

Security Agentは、Review Agentの承認を前提にせず、秘密情報・入力処理・パス境界・HTML生成・依存関係・CI出力を確認する。

### 5. マージ判定

次のすべてを満たした場合のみマージする。

- Coding Agentの検証が成功している
- Review Agentに未解決の`blocker` / `major`がない
- Security Agentに未解決の`critical` / `high`がない
- 必要なSpec・ADR・Rulesの更新が済んでいる

## エージェント間の受け渡し

各報告には、次の4項目を必ず含める。

```text
変更したこと
確認したこと
確認できなかったこと
残っているリスクまたは課題
```
