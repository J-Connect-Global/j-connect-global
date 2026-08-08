# J-Connect A1–C2 語彙デッキの設計・出典・品質基準

更新日: 2026-08-08

## 結論

CEFRは「そのレベルで何ができるか」を記述する枠組みであり、A1からC2までの公式な全単語リストではない。したがって、この教材の語数と単語ごとの帯分けは「公式必修語」ではなく、公開資料と再配布可能な辞書・頻度資料を組み合わせたJ-Connect独自の累積学習目標として表示する。

| 到達レベル | 累積目標 | そのレベルで追加するカード |
| --- | ---: | ---: |
| A1 | 650 | 650 |
| A2 | 1,300 | 650 |
| B1 | 2,400 | 1,100 |
| B2 | 4,000 | 1,600 |
| C1 | 7,000 | 3,000 |
| C2 | 10,000 | 3,000 |

A1の約650、A2の約1,300、B1の約2,400という規模はGoethe-Institutの公開語彙リストと整合する。Goethe-Institutが公開する語彙リストはA1〜B1であり、B2〜C2に同等の公式全語リストはない。C1・C2を含む目標値は、CEFRの語彙範囲記述と一般語彙・専門語彙の広がりを運用可能なデッキへ変換したJ-Connect基準である。

## 参照資料

- Council of Europe, *CEFR Companion Volume with New Descriptors*: A1からC2までの語彙範囲・語彙運用能力の記述。
  - https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2018/1680787989.pdf
- Goethe-Institut, *Goethe-Zertifikat A1 Wortliste*: 約650語、能動的に使える語彙はその約半分という説明。
  - https://www.goethe.de/pro/relaunch/prf/sr/A1_SD1_Wortliste_02.pdf
- Goethe-Institut, *Goethe-Zertifikat A2 Wortliste*: 約1,300 lexical units。
  - https://www.goethe.de/resources/files/pdf329/goethe-zertifikat_a2_wortliste.pdf
- Goethe-Institut, *Goethe-Zertifikat B1 Wortliste*: 約2,400 lexical units。本文の複製・ネットワーク保存を許可なく行えない旨も明記されているため、J-Connectのカードデータへ語彙本文を転記しない。
  - https://www.goethe.de/pro/relaunch/prf/id/Goethe-Zertifikat_B1_Wortliste.pdf
- CEFRLex DAFlex: CEFR別教材・簡易読本に観察された語彙頻度を使う学術的方法の比較対象。CC BY-NC-SA 4.0のため、J-Connectの再配布データには取り込まず、設計の参照に限定する。
  - https://cental.uclouvain.be/cefrlex/daflex/

## 再配布する語彙データ

### FreeDict German–Japanese

- 版: `deu-jpn 2025.11.23`
- 元データ: FreeDict + WikDict / Wiktionary / DBnary
- ライセンス: CC BY-SA 3.0
- 用途: ドイツ語見出し語、日本語語義、確認できる名詞の性
- URL: https://download.freedict.org/dictionaries/deu-jpn/2025.11.23/

### Leipzig Corpora Collection

- コーパス標本: `deu_mixed-typical_2011_100K`、`deu_news_2020_100K`、`deu_wikipedia_2021_100K`
- ライセンス: CC BY
- 用途: 一般頻度と複数コーパスでの出現範囲
- URL: https://wortschatz.uni-leipzig.de/en/download/German

FreeDict由来のカードデータはCC BY-SA 3.0の継承条件に従う。コード、ページ本文、J-Connect独自の編集済み例文まで一律に同ライセンスへ変更するものではない。

## 帯分け方法

1. 既存の編集済み200枚を各A1〜B2の50枚として予約する。
2. FreeDictの見出し語を正規化し、同一表記の重複を除く。ドイツ語では大小文字が語彙を区別するため、大小文字は保持する。
3. Leipzigの3標本で正規化頻度とコーパス被覆を計算する。
4. A1の身近な物・人・時間・基本動詞・基本形容詞はJ-Connect編集基準で優先する。
5. 固有名、専門分野、略語、長い複合語、低被覆語、抽象語形成が明瞭な語には難度ペナルティを与える。
6. 優先順に各レベルの追加枠へ割り当て、全レベルで見出し語を重複させない。

この方法は、個々の語に公的なCEFR認定を与えるものではない。多義語は語義単位ではなく見出し語単位であり、訳語はFreeDictの語義を短い順に最大3件表示する。固有名・同綴異義語・分野語には機械処理の限界が残るため、編集レビュー対象とする。

## 品質区分

- `editorial-reviewed`（200枚）: 日本語訳、自然な独文例、和訳、名詞・動詞の主要文法、コロケーション、学習メモをJ-Connectで編集済み。
- `reference`（9,800枚）: 再配布可能な出典と頻度根拠を持つ見出し語カード。例文、複数形、動詞活用、格支配、細かな語義選択はレビュー待ち。

参照カードを「完成済み」「公式」「全語を保証」と表示してはいけない。公開画面では品質差を常に説明する。

## 再生成

```powershell
node scripts/prepare-cefr-lexicon.mjs `
  --deu-jpn C:\path\to\deu-jpn.tei `
  --leipzig-words C:\path\to\deu_mixed-typical_2011_100K-words.txt `
  --leipzig-words C:\path\to\deu_news_2020_100K-words.txt `
  --leipzig-words C:\path\to\deu_wikipedia_2021_100K-words.txt

node scripts/generate-learn-german-flashcards.mjs
node scripts/test-learn-german-flashcards.mjs
```

更新時は入力版、ライセンス、生成件数、重複、A1/A2の先頭標本、各レベルの品詞分布、固有名・専門語の位置を必ず再確認する。
