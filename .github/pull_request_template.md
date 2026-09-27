## 変更内容と根拠

<!-- 変更目的、関連Issue・Spec、Architecture/ADR/Rulesへの影響を記載してください。 -->

## 確認

- [ ] 変更に応じてSpec・Architecture・ADR・Rules・READMEを更新した、または不要な理由を記載した
- [ ] UI変更なら施設予約サンプルで表示・遷移・分割を目視確認した
- [ ] 公開できない案件情報や秘密情報を差分・画像・ログに含めていない
- [ ] Review Agentの`blocker` / `major`、Security Agentの`critical` / `high`に未解決事項がない（適用した場合）

## 検証結果

```sh
npm run governance:check
npm test
npm run check -- --project examples/order-management --format json
npm run check -- --project examples/facility-admin --format json
# Studioを変更した場合
npm run build -- --project examples/facility-admin
```

## 未確認事項・リスク

<!-- 実行しなかった検証と理由、互換性への影響、後続タスクを記載してください。 -->
