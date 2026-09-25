# 注文キャンセルAPI

出荷前の注文をキャンセルする。

**API**: `POST /orders/{orderId}/cancel`

## Rules

- キャンセル理由は必須
- キャンセルできない状態では409を返す

## Related sources

- [OpenAPI contract](../../../openapi.yaml)
