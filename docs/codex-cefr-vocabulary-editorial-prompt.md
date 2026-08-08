# Codex向け: CEFR語彙カード編集レビュー用プロンプト

次のプロンプトは、`quality_tier: "reference"` のカードを100枚ずつ編集済みに昇格させるために使う。10,000枚を一度に処理せず、レベル・頻度順の小さなバッチでレビューする。

```text
あなたは日本語母語話者向けドイツ語教材の編集者です。

対象:
- assets/data/learn-german/flashcards/cards-<level>.json のうち
  verification_status が source-aligned-needs-editorial-review のカードを、frequency_rank順に最大100枚

必須作業:
1. 見出し語と日本語訳を、Duden、DWDS、Wiktionary/FreeDictなど確認可能な辞書資料で照合する。
2. 多義語は対象レベルで最も有用な語義を先頭にし、誤解を招く古語・固有名・別語義を除く。
3. 名詞は自然な表示形、性、複数形を確認する。固有名に不自然な冠詞を付けない。
4. 動詞は三人称単数、過去分詞、完了助動詞、分離・非分離、再帰性、主要な格支配を確認する。
5. その語義に対応する自然で短い独文例を新規作成し、日本語訳を付ける。出典の例文をコピーしない。
6. よく使うコロケーションを0〜3件、学習上必要な注意を1〜2文、関連語を0〜3件追加する。
7. CEFR帯が明らかに不適切なら、理由を記録し、重複を生まない形で正しい帯へ移す。
8. 完了したカードだけ quality_tier を editorial-reviewed、verification_status を j-connect-editorial-reviewed にし、verified_at を当日に更新する。

禁止:
- 未確認の語形、訳、例文を断定しない。
- Goethe等の著作権付き語彙リストや教材例文を転記しない。
- 出典のないAI生成内容を「公式」と表示しない。
- 既存の編集済みカードIDを変更しない。

検証:
- node scripts/generate-learn-german-flashcards.mjs
- node scripts/test-learn-german-flashcards.mjs
- 対象100枚の日本語文字、独文句読点、名詞・動詞文法、重複を個別検査

最後に、レビュー済み件数、移動した語、除外した語、判断保留、参照した資料、テスト結果を報告してください。
```

生成ファイルを直接編集すると次回の生成で上書きされる。恒久的な編集結果は、将来 `content/learn-german/flashcards/editorial-overrides.json` のようなソースファイルへ保存し、生成器で適用する構造へ移行すること。
