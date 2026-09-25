# ADR-0002: API契約モードを明示する

## Status

accepted

## Context

OpenAPIとZodを別々に編集すると、同じAPI契約を二重管理することになる。プロジェクトによってOpenAPI-firstとcode-firstの採用方針は異なるため、どちらかを一律に固定することもできない。

## Decision

API契約は、`contract-first`または`code-first`のいずれかをプロジェクト設定で明示する。両方を独立した正本として扱わない。

## Consequences

- 診断の基準となる方向が明確になる
- ZodからOpenAPIを生成する既存OSSを利用できる
- 将来、OpenAPI-firstの検証も同じ中間モデルに追加できる
