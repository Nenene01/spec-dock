---
title: 施設一覧取得API
summary: 管理対象の施設を条件付きで検索し、ページ単位で返す。
api:
  method: GET
  path: /facilities
---

# 施設一覧取得API

管理対象の施設を条件付きで検索し、ページ単位で返す。

## 基本情報

| 項目 | 内容 |
| :--- | :--- |
| 認証 | 管理担当者のBearerトークン |
| 許可ロール | ADMIN / EDITOR / VIEWER |
| Content-Type | レスポンスはapplication/json |
| 操作ID | listFacilities |

## リクエスト

| 名前 | 場所 | 必須 | 形式・範囲 | 意味 |
| :--- | :--- | :--- | :--- | :--- |
| name | query | 任意 | 最大100文字 | 施設名の部分一致 |
| status | query | 任意 | DRAFT / ACTIVE / INACTIVE | 状態 |
| page | query | 任意 | 1以上、既定1 | ページ番号 |
| limit | query | 任意 | 1～100、既定20 | 1ページの件数 |
| X-Request-Id | header | 任意 | 最大64文字 | 問い合わせ用追跡ID |

例: `GET /facilities?status=ACTIVE&page=1&limit=20`

## レスポンス

200の `data[]` は施設ID、施設コード、名称、状態、登録日時を持つ。`pageInfo` はページ番号、件数、総件数を持つ。該当がない場合も200で空配列を返す。

## 処理・検証

1. トークンから組織IDとロールを取得する。
2. 条件の型・最大長・ページ範囲を検証する。
3. 組織IDと論理削除されていない条件を必ず適用し、指定された検索条件をANDで組み合わせる。
4. 登録日時の降順、同時刻ならIDの昇順で返す。読み取りのみで更新トランザクションはない。

## エラー

| HTTP | 条件 |
| :--- | :--- |
| 400 | 条件の型・範囲が不正 |
| 401 | 認証できない |

API項目と制約は[OpenAPI](../../../openapi.yaml)、検索対象は[Prisma Schema](../../../prisma/schema.prisma)を参照する。
