# SpecDock agents

SpecDockでは、1つの万能エージェントにすべてを任せず、3つの役割を最小構成として運用します。

```text
Coding Agent
    ↓
Review Agent
    ↓
Security Agent
    ↓
人間またはリリース担当によるマージ判定
```

各エージェントの定義は次の文書です。

- [Coding Agent](coding.md)
- [Review Agent](review.md)
- [Security Agent](security.md)

エージェントは同じ作業を繰り返すのではなく、前の役割の成果物と報告を入力として利用します。
