# ADR-0001: 既存標準を正本として接続する

## Status

accepted

## Context

独自DSLは思想を一貫させやすい一方、既存プロジェクトへの導入コストと利用者の学習コストが高い。Prisma、Zod、OpenAPI、Markdownには既にエコシステムとツールがある。

## Decision

SpecDockは独自の正本形式を新設せず、既存のソース形式へ接続する補助OSSとして実装する。

## Consequences

- 既存プロジェクトへ段階的に導入できる
- 各形式の更新やライセンスを追跡する必要がある
- 形式ごとの差異を中間モデルで吸収する
- SpecDockのStudioは編集画面ではなく、発見・理解・検証画面から始める
