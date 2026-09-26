---
title: 予約詳細取得API
summary: 状態変更の判断に必要な予約と版番号を取得する。
api:
  method: GET
  path: /reservations/{reservationId}
---

# 予約詳細取得API

状態変更の判断に必要な予約と版番号を取得する。

## 基本情報

| 項目 | 内容 |
| :--- | :--- |
| 認証 | 管理担当者のBearerトークン |
| 許可ロール | ADMIN / EDITOR / VIEWER |
| 操作ID | getReservation |

## リクエスト

| 名前 | 場所 | 必須 | 形式 |
| :--- | :--- | :--- | :--- |
| reservationId | path | 必須 | UUID |

## レスポンス

200で予約番号、施設ID、区画ID、状態、利用日時、更新競合確認用の `version` を返す。

## 処理・検証

1. 予約IDの形式を検証する。
2. 認証済み組織に属する予約だけを取得する。
3. 対象がない場合と他組織の場合は404を返す。読み取りのみ。

## エラー

| HTTP | 条件 |
| :--- | :--- |
| 401 | 認証できない |
| 404 | 対象がない、または組織境界の外にある |

定義元: [OpenAPI](../../../openapi.yaml) / [Prisma Schema](../../../prisma/schema.prisma)。
