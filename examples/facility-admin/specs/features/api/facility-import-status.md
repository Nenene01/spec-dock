---
title: 施設CSV取込状況取得API
summary: 施設CSV取込ジョブの進行状態と処理件数を確認する。
api:
  method: GET
  path: /facility-imports/{jobId}
---

# 施設CSV取込状況取得API

施設CSV取込ジョブの進行状態と処理件数を確認する。

## 基本情報

| 項目 | 内容 |
| :--- | :--- |
| 認証 | 管理担当者のBearerトークン |
| 許可ロール | ADMIN / EDITOR / VIEWER |
| 操作ID | getFacilityImport |

## リクエスト

| 名前 | 場所 | 必須 | 形式 |
| :--- | :--- | :--- | :--- |
| jobId | path | 必須 | UUID |

## レスポンス

200でジョブID、状態、総件数、受付件数、拒否件数を返す。状態は `QUEUED` → `RUNNING` → `COMPLETED` または `FAILED`。進行中の件数は暫定値である。

## 処理・検証

1. ID形式と認証を確認する。
2. トークンの組織IDに属するジョブだけを取得する。読み取りのみ。
3. 該当がない場合や他組織のジョブの場合は404を返す。ファイル本文や行単位の個人情報は返さない。

## エラー

| HTTP | 条件 |
| :--- | :--- |
| 401 | 認証できない |
| 404 | 対象がない、または組織境界の外にある |

定義元: [OpenAPI](../../../openapi.yaml) / [Prisma Schema](../../../prisma/schema.prisma)。
