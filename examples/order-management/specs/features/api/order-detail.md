# Get order API

注文番号ではなく注文IDを指定して、顧客・明細を含む注文詳細を取得する。

**API**: `GET /orders/{orderId}`

## Response

- 注文状態はenumで管理する
- 明細の商品名と注文時単価を返す

## Related sources

- [OpenAPI contract](../../../openapi.yaml)
