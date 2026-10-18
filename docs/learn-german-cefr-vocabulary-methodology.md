# ドイツ語教材の分類・収録数・監査方法

更新日: 2026-10-18

## 今回修正した問題

旧生成処理はA1 650 / A2 650 / B1 1,100 / B2 600 / C1 500 / C2 500の枠を先に決め、主に一般コーパス頻度で候補を順に埋めていた。頻度はCEFR難度の根拠にならず、後ろの枠に初級語や固有名詞が入り得た。旧テストも固定件数と一部の上書きを確認するだけで、この誤りを防いでいなかった。固定枠・頻度によるレベル判定・掲載がない語の自動昇格を廃止した。

## 公開する範囲

数は単語・句・表現を合わせた収録項目数であり、学習者に必要な総語数ではない。

| 教材 | 収録項目 | 分類の意味 |
| --- | ---: | --- |
| A1 | 592 | 公開資料との見出し語照合に基づく学習目安 |
| A2 | 405 | 公開資料との見出し語照合に基づく学習目安 |
| B1 | 836 | 公開資料との見出し語照合に基づく学習目安 |
| B2 | 28 | CEFR記述を参考にした独自編集の表現練習 |
| C1 | 32 | CEFR記述を参考にした独自編集の表現練習 |
| C2 | 20 | CEFR記述を参考にした独自編集の表現練習 |

レベル別は合計1,913項目、別にCEFR未判定の場面用語121項目。旧4,000項目のうち1,958項目を掲載し、2,042項目を保留した。新規76項目を追加し、合計2,034項目を公開する。旧場面表現4項目は同じ意味の語句を明示した形へ整え、B2の表現練習へ移した。上級練習は合計80項目（B2 28 / C1 32 / C2 20）であり、各レベルの語彙を網羅するものではない。

保留の内訳は、掲載根拠不足2,023・重複7・元辞書の固有名標識12。保留は「不要な語」「上級語」「誤訳」と認定する処理ではない。未判定の語を上級に入れないための措置である。人名等の除外も元資料の標識によるもので、固有名が完全に除去されたという保証はしない。

## 語数に関する根拠

CEFRは言語能力の記述であり、全言語に共通するレベル別の必修単語表ではない。Goethe A1資料の約650、A2の約1,300、B1の約2,400という記述は、それぞれの資料の語彙規模を説明するもの。650→1,300→2,400を差し引いて排他的なレベル別必修数を算出してはならない。

- Council of Europe, reference level descriptions: https://www.coe.int/en/web/common-european-framework-reference-languages/reference-level-descriptions
- CEFR Companion Volume 2020, Vocabulary range, 131ページ: https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4#page=131

## A1〜B1の照合手順と限界

1. 旧公開4,000項目のID・見出し語・旧レベルを `legacy-card-index.json` に保存した。基準コミットは同ファイルの `source_commit`。
2. 公式PDFの見出し語列を座標で抽出し、例文列を照合対象から除く。単語群ページは見出し語とは区別して記録する。
3. 既存の独立したFreeDict/J-Connect見出し語を完全一致で照合する。正規化はNFC、先頭のsichを外す明示的照合、Schmerzen→Schmerzのみ。曖昧検索・一般的な語幹推定・英訳の類似判定は行わない。
4. A1→A2→B1の順に、掲載を確認した最初の資料を学習配置の目安とする。全ての掲載資料と物理PDFページを `level-evidence.json` に保存する。
5. 再帰形等の同一見出し語・品詞は既存の場面表現を優先して重複を除く。掲載が見つからない語はCEFR未判定とし、元の場面表現以外は公開を保留する。

**資料に掲載があることと、個々の語義・用例がそのレベルに認定されていることは異なる。** 綴りの照合では多義語や同形異義語を完全には扱えない。PDF抽出にも見落としがあり得る。A2/B1に配置された語がA1では現れないことを保証せず、「下位語を完全除外」「全試験語彙を収録」と表示しない。日本語語義とTatoeba例文の意味の一致も専門家による全件確認済みではない。

## B2〜C2の練習目標

`advanced-practice.tsv` は独自作成の表現・和訳・例文・学習メモを持つ。各カードで「独自編集」とCEFR参照を示す。

- B2: 理由を伴う意見、比較、根拠と結論、条件交渉。
- C1: 前提・推論・留保を明確にし、抽象的な議論を精密にする。
- C2: 慣用表現、暗黙の評価、皮肉、文体、聞き手への響きを文脈で説明する。

各表現を初めて学ぶレベルの認定ではない。例文を表面から表示し、言い換えや含意の説明を課題にする。和訳と学習メモは解答の手掛かりであり、自由回答の採点機能や専門家による認定はない。珍しい単語を一定数集めてCレベルと呼ぶ方式には戻さない。

## 具体的な修正

| 見出し語 | 旧分類 | 今回の配置 | 根拠（物理PDFページ） |
| --- | --- | --- | --- |
| abfahren | C1 | A1の学習目安 | Goethe A1 p.9 |
| Briefmarke | C2 | A1の学習目安 | Goethe A1 p.12 |
| Kugelschreiber | C2 | A1の学習目安 | Goethe A1 p.19 |
| Quittung | C1 | B1の学習目安 | Goethe B1 p.72 |
| vierundzwanzig | C2 | A1の学習目安 | Goethe A1 p.7（単語群） |
| Henry / WikiLeaks | C1 | 公開保留 | 元辞書の固有名標識 |

## 再現と検証

公式PDFは監査用のローカル入力のみで、リポジトリや公開データへ本文・例文・PDFそのものを複製しない。既存の独立した見出し語に、掲載先とページを付ける。

| 資料 | URL | SHA-256 |
| --- | --- | --- |
| A1 | https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf | `45fb648bc0ac02338f7898cae065953e320ab72ed0c14e13e0deffe6f1c5d64e` |
| A2 | https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_A2_Wortliste.pdf | `c9ca0c96c4adb252f253e1cc648b95ea031e417911565db07f7102bccdbdb19e` |
| B1 | https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf | `8860f7f0c916831b2365f66239a3ceba3be81ddba28e1224846ca8420807fe42` |

監査用PDFを `a1.pdf`, `a2.pdf`, `b1.pdf` として保存し、PyMuPDFを導入した環境で実行する。

```sh
python3 scripts/audit-german-vocabulary.py --pdf-dir /path/to/pdfs
node scripts/generate-learn-german-flashcards.mjs
node scripts/test-learn-german-flashcards.mjs
npm run validate
npm run test:browser
```

通常の生成・CIはコミット済み照合証跡を使い、外部PDFのダウンロードに依存しない。列抽出の回帰テストは合成座標で左右両列・例文の除外・改行・明示的別形を確認する。教材テストは具体的な誤分類例と参照ページ、全旧IDの収支、未判定語の混入防止、出典、IDの意味保持、生成の再現性を確認する。件数を増やすための固定目標はテストしない。

`vocabulary-audit.csv` / `.json` は旧全4,000項目と追加76項目について旧レベル・新しい扱い・保留理由・参照情報を公開する。未公開カードの学習履歴も保存・バックアップ対象に残す。ID接頭辞は元レベルを示す履歴であり、現在のレベルや読み込むファイルを判定するために使わない。古いデッキURL `all-levels-4000` 等は互換性のため維持し、画面の名称と件数は現在の実データから表示する。

## 語義・例文の帰属

- FreeDict German–Japanese 2025.11.23 / FreeDict・WikDict・Wiktionary・DBnary: CC BY-SA 3.0。 https://download.freedict.org/dictionaries/deu-jpn/2025.11.23/
- Leipzig Corpora Collection: CC BY。旧候補資料への帰属を保持するが、CEFR分類には使わない。 https://wortschatz.uni-leipzig.de/en/download/German
- Tatoeba独日対訳: CC BY 2.0 FR。各例文に原文・訳文IDを保持する。自動照合は専門家の語義確認とは区別する。 https://tatoeba.org/en/downloads
- J-Connect作成の場面例文と新規練習例文: `j-connect-original` と表示し、架空のレビュー済み状態・確認日を付けない。
- DAFlexはレベル別教材中の頻度研究であり、単語の最低学習レベルを一意に与えるものではない。本データの分類・語義データとして取り込んでいない。

次の拡充は件数目標から始めず、語義・文脈・使用域・学習目標と資料を項目ごとに用意する。照合による配置と専門的な内容確認は別工程として記録する。
