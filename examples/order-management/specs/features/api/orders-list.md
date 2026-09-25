# List orders API

注文一覧をページングして取得する。

**API**: `GET /orders`

## Rules

- pageは1以上
- limitは1から100まで
- statusはpending、paid、shipped、cancelledのいずれか

## Related sources

- [OpenAPI contract](../../../openapi.yaml)
- [Order management](../order-management.md)
