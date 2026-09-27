# Studioのホスティングと閉域共有

SpecDockは特定のホストを前提にしません。社内PC・社内Webサーバー・VPN内の静的ホスト・クラウドのいずれでも、**静的ファイルを配信できること**が基本条件です。閉域共有の機能要件は[Spec](../../specs/features/offline-studio.md)、生成と配布の境界は[Architecture](../architecture/source-of-truth.md)を参照してください。

## 作成

SpecDockのリポジトリルートで実行します。`npm ci`は初回の依存取得時にネットワークを使います。完全に切り離されたビルド環境には、依存パッケージを事前に用意してください。

```sh
npm ci
npm run check -- --project /path/to/project --format json
npm run build -- --project /path/to/project
```

配布対象は`/path/to/project/.specdock/site/`**内の全ファイル**です。ディレクトリ構造を保ち、任意のホストのサイトルートまたはサブパスに配置します。`index.html`を単独でコピーすると、`model.json`やMermaidの分割JSが読み込めません。`.specdock/`全体には`scan.json`も含まれるため、そのまま公開しないでください。

Studioはビルド済みデータをブラウザで読みます。閲覧者側にNode.jsや元のプロジェクトの配置は不要です。`file://`でHTMLを直接開く方法は、ブラウザのローカルファイル制限により`model.json`を読めない場合があります。HTTP(S)の静的配信を利用してください。

## 公開前の確認

1. `site/model.json`には解析済みのAPI・モデル・Markdown本文などが入ります。元の仕様に秘密情報や個人情報が含まれないか、公開範囲に照らして確認します。SpecDockは自動で伏せ字にしません。
2. `site/`全体を**同じ認証・アクセス制御の内側**に置きます。`index.html`だけでなく`model.json`、`schema.mmd`、JSチャンク、アイコンも対象です。未認証状態で各ファイルのURLへ直接アクセスできないことを確かめます。
3. ホストに応じてVPN、IP許可リスト、SSO、Basic認証などを選びます。インターネット経由ならTLSを適用し、公開プレビューURLや配布用キャッシュも同じ保護範囲に含めます。認証方式をSpecDockに固定しません。
4. 古い成果物が残らないよう、公開時には新しいビルドの`site/`をひとまとまりとして配置します。ブラウザ・CDNキャッシュによる旧データの残存にも注意します。
5. 閉域環境で実際にページとDocument内のMermaid図を開き、開発者ツールで外部ドメインへの要求や読み込み失敗がないことを確認します。文書内の外部リンクは配布物には含まれません。

`npm run studio`と`npm run dev`が使う簡易サーバーはローカル確認用で、`127.0.0.1`にのみバインドします。共有用の認証付きサーバーとしては使わず、配布先のWebサーバーやゲートウェイで保護してください。
