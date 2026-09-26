---
title: 予約検索API
summary: 予約を施設・状態・利用開始日時で絞り込む。
api:
  method: GET
  path: /reservations
---

# 予約検索API

予約を施設・状態・利用開始日時で絞り込む。

## 基本情報

| 項目 | 内容 |
| :--- | :--- |
| 認証 | 管理担当者のBearerトークン |
| 許可ロール | ADMIN / EDITOR / VIEWER |
| 操作ID | listReservations |

## リクエスト

| 名前 | 場所 | 必須 | 形式・範囲 | 意味 |
| :--- | :--- | :--- | :--- | :--- |
| facilityId | query | 任意 | UUID | 施設を限定する |
| status | query | 任意 | REQUESTED / CONFIRMED / CANCELLED | 予約状態 |
| from | query | 任意 | ISO 8601日時、TZ付き | 開始日時の下限 |
| to | query | 任意 | ISO 8601日時、TZ付き | 開始日時の上限 |
| page | query | 任意 | 1以上、既定1 | ページ番号 |
| limit | query | 任意 | 1～100、既定20 | 件数 |

例: `GET /reservations?status=REQUESTED&page=1&limit=20`

## レスポンス

200で予約一覧 `data[]` と `pageInfo` を返す。各予約に予約番号、施設ID、区画ID、状態、利用開始・終了日時、版番号を含む。

## 処理・検証

1. 日時が指定された場合は `from <= to` を検証する。
2. 施設IDが指定された場合、その施設が認証済み組織に属することを確認する。
3. 組織IDを必須条件にして指定条件をANDで適用し、開始日時の降順で返す。読み取りのみ。

## エラー

| HTTP | 条件 |
| :--- | :--- |
| 400 | 期間の前後関係や件数範囲が不正 |
| 401 | 認証できない |

定義元: [OpenAPI](../../../openapi.yaml) / [Prisma Schema](../../../prisma/schema.prisma)。
