# Coding rules

- Readerは入力形式の解析に責務を限定する
- Core modelはReaderやStudioの実装詳細を持たない
- Studio Rendererは中間モデルだけを参照する
- 依存方向を逆転させるために、UIからReaderへ直接依存しない
- 1つの変更理由に対して1つの責務を保つ
- 新しい独自DSLを追加する前に、既存標準形式で表現できない理由をADRに記録する
