# Architecture

このディレクトリは、SpecDockを「どう構成するか」を定義します。

## 方針

- 解析対象のソースを正本とし、SpecDockは読み込み・診断・閲覧用サイトの生成を担当する
- Reader、Coreのスキャンと診断、CLI、React Studioを責務ごとに分離する
- Studioへは中間モデルを渡し、Readerの実装詳細を漏らさない

## レイヤー

```text
Prisma / Zod / OpenAPI / Markdown
                 ↓
              Readers
                 ↓
       Core（scan / diagnostics）
          ↙              ↘
   CLI check        CLI build / serve / dev
                           ↓
                    React Studio（中間モデルを閲覧）
```

CLIは処理を組み立て、React Studioはブラウザで中間モデルを表示する。静的サイトとER図は再生成可能な成果物である。依存方向はFeatureのSpecではなく、横断的なArchitectureとして管理する。

## 関連文書

- [Source of truth architecture](source-of-truth.md)
- [Ecosystem and migration](ecosystem.md)
- [Architecture decisions](../adr/README.md)
- [Implementation rules](../../rules/README.md)
