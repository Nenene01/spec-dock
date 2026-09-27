# ADR-0002: API契約モードを明示する

## Status

accepted

## Context

OpenAPIとZodを別々に編集すると、同じAPI契約を二重管理することになる。プロジェクトによってOpenAPI-firstとcode-firstの採用方針は異なるため、どちらかを一律に固定することもできない。

## Decision

API契約は、`contract-first`または`code-first`のいずれかをプロジェクト設定で明示する。両方を独立した正本として扱わない。

## Consequences

- 診断の基準となる方向が明確になる
- プロジェクト側でZodからOpenAPIを生成するツールを選べる。SpecDockは生成を担当しない
- 現状はモードに応じた基本診断のみを行う。詳細なフィールド整合検証は別途実装・受け入れ条件が必要
