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
- 既存文書を変更する設計判断にはADRを追加する
- 生成物を正本として編集しない
