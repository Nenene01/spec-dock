# Architecture

このディレクトリは、SpecDockを「どう構成するか」を定義します。

## 方針

- 解析対象のソースを正本として扱い、SpecDockは発見・検証・生成を担当する
- Reader、Core model、Diagnostics、Studio Renderer、CLIを責務ごとに分離する
- Readerの実装詳細をStudioへ漏らさず、中間モデルを境界にする
- 依存方向は、UIからReaderへ直接依存せず、CLIから各処理を組み立てる方向にする

## レイヤー

```text
CLI / Studio
    ↓
Application（scan / check / build）
    ↓
Core model / diagnostics
    ↓
Readers（Prisma / Zod / OpenAPI / Markdown）
```

4層アーキテクチャや依存方向は個別FeatureのSpecではなく、横断的なArchitectureとして管理する。

## 関連文書

- [Source of truth architecture](source-of-truth.md)
- [Ecosystem and migration](ecosystem.md)
- [Architecture decisions](../adr/README.md)
- [Implementation rules](../../rules/README.md)
