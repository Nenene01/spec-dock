## Summary

<!-- 変更内容と対象Specを記載してください。 -->

## Agent gate

- [ ] Coding Agent: 実装・テスト結果を報告済み
- [ ] Review Agent: `blocker` / `major` の未解決指摘なし
- [ ] Security Agent: `critical` / `high` の未解決リスクなし
- [ ] 必要なSpec / Architecture / ADR / Rulesを更新済み

## Verification

```sh
npm run governance:check
npm test
npm run check -- --project examples/order-management --format json
```

## Risks and follow-ups

<!-- 未確認事項、リスク、後続タスクを記載してください。 -->
