---
title: お知らせ作成API
summary: お知らせを下書き、または公開予約として登録する。
api:
  method: POST
  path: /announcements
---

# お知らせ作成API

お知らせを下書き、または公開予約として登録する。

## 基本情報

| 項目 | 内容 |
| :--- | :--- |
| 認証 | 管理担当者のBearerトークン |
| 許可ロール | ADMIN / EDITOR |
| リクエスト | application/json |
| 操作ID | createAnnouncement |

## リクエスト

| 名前 | 型 | 必須 | 制約・意味 |
| :--- | :--- | :--- | :--- |
| title | string | 必須 | 1～120文字 |
| body | string | 必須 | 1～4000文字 |
| publishAt | string | 任意 | タイムゾーン付きISO 8601日時。指定すると公開予約 |

## レスポンス

201でお知らせID、タイトル、状態、公開予定日時を返す。`publishAt` がなければ `DRAFT`、あれば `SCHEDULED`。

## 処理・検証

1. 権限と文字数を確認する。公開予定日時は現在より後に限る。
2. トークンの組織IDと担当者IDでお知らせを保存する。
3. お知らせ登録と監査履歴は同じトランザクションに含める。外部配信は行わない。

## エラー

| HTTP | 条件 |
| :--- | :--- |
| 400 | 必須項目、長さ、公開予定日時が不正 |
| 403 | 編集権限がない |

定義元: [OpenAPI](../../../openapi.yaml) / [Prisma Schema](../../../prisma/schema.prisma)。
