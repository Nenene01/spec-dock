# Documentation rules

| 種類 | 問い | 配置 |
| --- | --- | --- |
| Spec | 何を満たすべきか | `specs/` |
| Architecture | どう構成するか | `docs/architecture/` |
| ADR | なぜその設計を選んだか | `docs/adr/` |
| Guide | どう開発・運用するか | `docs/guides/` |
| Rule | 常に何を守るか | `rules/` |

## 記述上の境界

- Feature固有の受け入れ条件をRulesへ書かない
- 横断的な実装規約をFeature Specへ重複して書かない
- 正本の選択や依存境界を変える設計判断にはADRを追加する。文言修正や実装に合わせた更新だけなら不要
- 生成物を正本として編集しない
- 既存の文書を更新してから新しい文書を増やす。機能の現状と将来計画を混同しない
