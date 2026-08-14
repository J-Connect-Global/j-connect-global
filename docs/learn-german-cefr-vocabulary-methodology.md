# J-Connect A1–C2 暗記カードのレベル設計・品質基準

更新日: 2026-08-14

## 結論

CEFRは言語運用能力をA1からC2まで記述する枠組みであり、すべての言語に共通する公式の単語別レベル表ではない。J-Connectでは、頻度順位だけでカードを一括配分せず、語義・文法・使用場面・表現の抽象度をカード単位で確認してレベルを決める。

公開デッキには、次の品質ゲートを通過したカードだけを収録する。

- 日本語訳がそのカードで扱う語義と一致している
- 独文例と自然な日本語訳がある
- 名詞の性・複数形、動詞の活用・格支配など必要な文法情報がある
- コロケーション、学習メモ、関連語を必要に応じて補っている
- `quality_tier: "editorial-reviewed"` と `verification_status: "j-connect-editorial-reviewed"` を持つ
- A1〜C2のうち、学習上もっとも適切な1レベルへ割り当てられている

未レビューの辞書見出し語、機械訳、例文のないカードは、公開デッキへ入れない。カード数を増やすことより、表示内容を学習に使える状態へ揃えることを優先する。

## 現在の収録数

収録数は固定目標ではなく、レビューを完了したカード数である。正本は `assets/data/learn-german/flashcards/decks.json` と各 `cards-<level>.json` の件数とする。

| レベル | 編集レビュー済みカード |
| --- | ---: |
| A1 | 36 |
| A2 | 35 |
| B1 | 53 |
| B2 | 55 |
| C1 | 33 |
| C2 | 5 |
| 合計 | 217 |

教材は、全6レベルをまとめたデッキ、各レベル専用デッキ、場面別デッキから同じレビュー済みカードを参照する。場面別デッキではカードが再利用されるが、カードIDの正本はレベル別JSONに一つだけ存在する。

## レベル判定

カードは単なる出現頻度ではなく、次の観点を組み合わせて個別に判定する。

1. CEFR Companion Volumeの語彙範囲・文法的正確さ・社会言語的適切さの記述
2. Goethe-Institutの各レベル試験が想定するコミュニケーション場面
3. 日常での基本性、意味の抽象度、語法や構文の複雑さ、ニュアンス制御の必要性
4. DAFlex / CEFRLexが示す、レベル別教材コーパスで語彙分布を比較する方法論
5. 日本語母語話者がその表現を誤解なく運用するために必要な説明量

たとえば、`Guten Morgen!` や色名 `pink` は基本的な挨拶・描写なのでA1、`die Wahrnehmung` は抽象概念を扱うためC1、含意や論証を精密に調整する `mitnichten` や `etwas ad absurdum führen` はC2として扱う。

個々のカードに「公式CEFR認定」という意味はない。レベル判断が割れる語は、カードが扱う語義・例文・構文を基準にし、変更理由をレビューで説明できるようにする。

## 参照資料

- Council of Europe, [*Common European Framework of Reference for Languages: Companion Volume*](https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4)
- Goethe-Institut, [*Deutschprüfungen A1–C2*](https://www.goethe.de/de/spr/prf.html)
- [CEFRLex DAFlex](https://cental.uclouvain.be/cefrlex/daflex/)（レベル別教材・簡易読本コーパスに基づく語彙分布の方法論参照）

これらはレベル判断の参照資料であり、著作権のある語彙リストや例文をカードへ転記するための資料ではない。カードの例文・解説はJ-Connectで作成する。

## 生成時の自動品質ゲート

`scripts/generate-learn-german-flashcards.mjs` は公開データ生成前に、全カードについて次を検査する。

- 必須フィールドとA1〜C2のレベル
- 日本語文字を含む訳と例文訳
- 独文例・和文例の欠落
- 名詞・動詞に必要な文法情報
- レビュー状態と確認日
- 既知の誤訳（例: `おはよーん`、`ピンクな`）
- カードIDと見出し語の重複

検査に失敗した場合はJSONを出力しない。公開JSONを直接編集すると再生成で失われるため、恒久的な修正は生成スクリプト側の編集済みソースへ反映する。

## 再生成と検証

```bash
node scripts/generate-learn-german-flashcards.mjs
node scripts/test-learn-german-flashcards.mjs
npm run build
npm run validate
```

カード追加時は、訳・例文・文法・レベルを個別レビューした後、データ契約テストとデスクトップ／モバイルのブラウザテストを通す。
