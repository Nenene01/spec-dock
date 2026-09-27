# 採用しているエコシステム

この文書は、現行実装で使う外部ライブラリの役割を示します。採用の事実は[`package.json`](../../package.json)とロックファイルで確認してください。採用候補や旧リポジトリの移行手順は現行アーキテクチャではないため、ここでは管理しません。

| 依存 | 用途 |
| --- | --- |
| `@apidevtools/swagger-parser` | OpenAPIの読み込み・解析 |
| React / React DOM | Studioの画面 |
| `@xyflow/react` / `@dagrejs/dagre` | 操作できるER図と自動配置 |
| `react-icons` | Studioのアイコン |
| Vite / `@vitejs/plugin-react` | Studioのビルド |

Prisma SchemaとZodは入力形式として扱い、このリポジトリの実行時依存としてのPrisma/Zod本体は導入していません。Prisma・Zod・Markdownの読み込み処理は`packages/readers/`にあります。Mermaid文字列も生成しますが、Studioの主なER図表示はXYFlowを使います。

新しい依存を採用するときは、既存の機能で代替できない理由、保守状況、ライセンス、配布時の影響をPRで確認してください。`package.json`に記載しただけで第三者ライセンスの確認が完了したとは扱いません。
