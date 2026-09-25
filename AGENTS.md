# Agent operating instructions

SpecDockで作業するエージェントは、最初に[CONSTITUTION.md](CONSTITUTION.md)を読み、タスクに必要なSpec・Architecture・Rules・ADRだけを参照する。

## 役割の選択

- 実装・修正: [Coding Agent](agents/coding.md)
- 変更レビュー: [Review Agent](agents/review.md)
- セキュリティ確認: [Security Agent](agents/security.md)

## 共通の完了条件

- 対象Specの受け入れ条件を確認している
- 変更範囲と未変更範囲が説明できる
- 実行した検証と結果を報告している
- 未解決の重大な指摘を隠していない

詳細な流れは[Agent development loop](docs/guides/agent-loop.md)を参照する。
