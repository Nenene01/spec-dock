---
title: 施設詳細取得API
summary: 指定した施設の情報を組織境界内で取得する。
api:
  method: GET
  path: /facilities/{facilityId}
---

# 施設詳細取得API

指定した施設の情報を組織境界内で取得する。

## 基本情報

| 項目 | 内容 |
| :--- | :--- |
| 認証 | 管理担当者のBearerトークン |
| 許可ロール | ADMIN / EDITOR / VIEWER |
| 操作ID | getFacility |

## リクエスト

| 名前 | 場所 | 必須 | 形式 | 意味 |
| :--- | :--- | :--- | :--- | :--- |
| facilityId | path | 必須 | UUID | 施設ID |

## レスポンス

200で施設ID、コード、名称、状態、登録日時を返す。HTTPレスポンスは `application/json`。

## 処理・検証

1. UUID形式を確認する。
2. トークンの組織IDと一致し、論理削除されていない施設を取得する。
3. 読み取りのみ。対象がない場合や他組織の施設IDの場合は404を返す。

## エラー

| HTTP | 条件 |
| :--- | :--- |
| 401 | 認証できない |
| 404 | 対象がない、または組織境界の外にある |

定義元: [OpenAPI](../../../openapi.yaml) / [Prisma Schema](../../../prisma/schema.prisma)。
