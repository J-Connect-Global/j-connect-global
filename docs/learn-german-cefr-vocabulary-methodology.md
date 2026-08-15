# J-Connect A1–C2 語彙デッキの設計・出典・品質基準

更新日: 2026-08-15

## 結論

CEFRは「そのレベルで何ができるか」を記述する枠組みであり、A1からC2までの公式な全単語リストではない。したがって、この教材の語数と単語ごとの帯分けは「公式必修語」ではなく、公開資料と再配布可能な辞書・頻度資料を組み合わせたJ-Connect独自のレベル別学習目標として表示する。辞書由来の不要な固有名詞を除き、独日例文を確認できる4,000語を6レベルへ重複なく割り当てる。各レベル教材は下位レベルの語彙を含まない。

| レベル | レベル専用カード | 下位レベルのカード |
| --- | ---: | ---: |
| A1 | 650 | 0 |
| A2 | 650 | 0 |
| B1 | 1,100 | 0 |
| B2 | 600 | 0 |
| C1 | 500 | 0 |
| C2 | 500 | 0 |
| 合計 | 4,000 | 0 |

A1の約650、A2の約1,300、B1の約2,400というGoethe-Institut公開語彙リストの規模は到達範囲の参照値として使う。本教材では下位レベル相当の語彙を差し引き、A2は650語、B1は1,100語のレベル専用枠とする。Goethe-Institutが公開する語彙リストはA1〜B1であり、B2〜C2に同等の公式全語リストはない。B2〜C2の専用枠は、CEFRの語彙範囲記述と一般語彙・専門語彙の広がりを運用可能なデッキへ変換したJ-Connect基準である。

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

### Tatoeba

- 入力: ドイツ語文、日本語文、文間リンクの公式エクスポート
- ライセンス: CC BY 2.0 FR
- 用途: 参照カードの独日対訳例文。各カードに原文・翻訳のIDを保持する。
- URL: https://tatoeba.org/en/downloads

FreeDict由来のカードデータはCC BY-SA 3.0の継承条件に従う。コード、ページ本文、J-Connect独自の編集済み例文まで一律に同ライセンスへ変更するものではない。

## 帯分け方法

1. 既存の編集済み200枚を各A1〜B2の50枚として予約する。
2. FreeDictの見出し語を正規化し、同一表記の重複を除く。ドイツ語では大小文字が語彙を区別するため、大小文字は保持する。
3. Leipzigの3標本で正規化頻度とコーパス被覆を計算する。
4. 独日対訳例文を出典付きで確認できる見出し語だけを参照カード候補にし、例文のないカードで件数を水増ししない。
5. A1の身近な物・人・時間・基本動詞・基本形容詞はJ-Connect編集基準で優先する。生活上の基本語が上位帯へずれないよう、代表語には編集済みレベル上書きを持つ。
6. 固有名、専門分野、略語、長い複合語、低被覆語、抽象語形成が明瞭な語には難度ペナルティを与える。
7. 優先順に各レベルの専用枠へ一度だけ割り当て、全レベルでカードIDと見出し語を重複させない。

生成後は6つのレベル教材を全組み合わせで比較し、共有カードIDと共有見出し語がともに0件であることを自動テストする。レベル教材の `card_files` も当該レベルのファイル1件だけに限定する。

この方法は、個々の語に公的なCEFR認定を与えるものではない。多義語は語義単位ではなく見出し語単位であり、訳語はFreeDictの語義を短い順に最大3件表示する。固有名・同綴異義語・分野語には機械処理の限界が残るため、編集レビュー対象とする。

## 品質区分

- `editorial-reviewed`（200枚）: 日本語訳、自然な独文例、和訳、名詞・動詞の主要文法、コロケーション、学習メモをJ-Connectで編集済み。
- `reference`（3,800枚）: 再配布可能な出典と頻度根拠を持つ見出し語カード。全カードに独日例文を収録し、3,797枚はTatoebaの出典IDを保持する。複数形、動詞活用、格支配、細かな語義選択はレビュー待ち。

参照カードを「完成済み」「公式」「全語を保証」と表示してはいけない。公開画面では品質差を常に説明する。

## 再生成

```powershell
node scripts/prepare-cefr-lexicon.mjs `
  --deu-jpn C:\path\to\deu-jpn.tei `
  --leipzig-words C:\path\to\deu_mixed-typical_2011_100K-words.txt `
  --leipzig-words C:\path\to\deu_news_2020_100K-words.txt `
  --leipzig-words C:\path\to\deu_wikipedia_2021_100K-words.txt

node scripts/prepare-tatoeba-flashcard-examples.mjs `
  --deu C:\path\to\deu.tsv.bz2 `
  --jpn C:\path\to\jpn.tsv.bz2 `
  --links C:\path\to\links.tar.bz2

node scripts/generate-learn-german-flashcards.mjs
node scripts/test-learn-german-flashcards.mjs
```

更新時は入力版、ライセンス、生成件数、重複、A1/A2の先頭標本、各レベルの品詞分布、固有名・専門語の位置を必ず再確認する。
