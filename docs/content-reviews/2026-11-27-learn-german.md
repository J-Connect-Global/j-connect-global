# AI提案 — 電話・職場会話の記事と画像の編集レビュー

作業日：2026年11月27日。報告の日本語化：2026年11月28日。
対象：Issue #544、PR #545。公開状況はPRとデプロイ履歴で確認する。

## 基点と重複作業の確認

- 基点：main `34a9e0f1476df4e5c01839dd0b0a528910f0a074`。
- 作業ブランチ：`malu/learn-german-editorial-20261127`。
- AGENTS.md、記事標準、一次情報レビュー基準、コンテンツ制作・Living・Events・画像の各ワークフローを確認した。
- PR #543（Sternsingerの出典）、#542（フランクフルト・ミュンヘン・買い物のドイツ語）、#505（債権回収・BundID）、#495（アーヘン・ミュンヘン・給付）とIssue #522を確認。今回の2本のMarkdownは、これらのPRの編集対象と重複しない。
- レジストリ、検索インデックス、ホーム、サイトマップなどの共通生成物は、他PRの先行マージ時に再生成が必要になる場合がある。

## 変更内容

| 対象 | 改善 |
| --- | --- |
| G011 電話のフレーズ | 2つの会話例に和訳を追加し、架空の学習例と明記。Frau／Herrnの形を分け、DINの都市名による綴り用語の例と任意利用の説明を追加。 |
| G012 職場会話 | Sie／duの使い分け、作業内容・期限・優先順位の確認表現を追加。会話とメールに和訳を付け、日程を明確化し、Danke für Ihre Geduldの訳を修正。 |
| 主画像2点 | 小さい文字を含む旧画像を、電話・職場会話が縮小表示でも分かる編集イラストへ置換。代替テキストと直下のAI開示を追加。WebPは1200／768／480px、SNS用はJPEG。実際の人物・会議・通話の記録ではない。 |
| G012本文図解 | 作業内容・期限・優先順位の3つの質問を示す独自SVGを追加。title／descと同等の本文テキストを備える。 |
| 生成物 | Markdownとレジストリ、記事・ハブHTML、検索インデックス、サイトマップを同期。ホームの開催中イベントの日付は編集基準日により11月27日へ自動更新。 |

ID、slug、URL、タイトル、公開日、従来のlast_verifiedは保持。updated_atは編集日を表し、全内容の再検証や人間の母語話者による校閲済みを意味しない。

スペイン語の記事・公開ルートは現在のレジストリに見当たらない。編集対象は日本語版で、英語・ドイツ語は準備中ページ。今回、新言語版は追加していない。Search Consoleの記録へのアクセスは確認したが、非公開の計測値はリポジトリへ掲載せず、この変更による流入増加も主張しない。PR #542のCTR改善対象は変更しない。

## 出典とリンク

2026年11月27日に以下を開いて確認した。

- [DIN — Von Aachen bis Zwickau](https://www.din.de/de/din-und-seine-partner/presse/mitteilungen/von-aachen-bis-zwickau-867074)：都市名による綴り用語表、Aachen・Salzwedelの例、利用が任意であること。直接取得でもHTTP 200。
- [Goethe-Institut — Auf der Arbeit: Du oder Sie?](https://www.goethe.de/de/spr/ueb/daa/all/ds0/ds1.html)：職場での呼びかけの練習教材。HTTP 200。追加した例文は編集部の独自例で、同機関の原文とは表示しない。

両Markdownの内部リンク6種類は対応するindex.htmlが存在する。この範囲にリンク切れは見つからなかった。全サイトの外部リンク監査を完了したという意味ではない。

## 検証結果

- npm ci --ignore-scripts --no-audit --no-fund：成功。
- 編集前のビルド・検証：成功し、生成物の差分なし。
- npm run build、npm run validate：成功。静的検証38群には同期、編集品質、画像・クレジット、構造的アクセシビリティ、ルート、SEO、生成アーティファクトを含む。
- SEO検証：312 HTML、サイトマップ243 URLを確認。
- node scripts/check-content-metadata-regression.mjs --base-ref origin/main、git diff --check：成功。
- ローカルのnpm run validate:allはビルドと静的検証を通過したが、標準Chromiumの取得がHTTP 403となったため、このコマンド全体を成功とはしていない。
- リポジトリ外の一時設定で同じPlaywrightスイートを実行。@sparticuz/chromium 158.0.0によるChromium 158.0.8127.0で、147件成功、スイート定義による3件スキップ、失敗なし（4.9分）。実行ファイル・起動引数・絶対パス・ワーカー数のみを変更し、各画面サイズとプロジェクト設定は保持。プロジェクトの依存関係は変更していない。
- 2記事を1440px／360pxで確認。横方向のはみ出し、表示画像の読み込み失敗、axeによるWCAG A／AAの自動検出違反なし。本文図解のモバイル表示も目視確認。これは人手による完全なアクセシビリティ監査ではない。
- 画像予算チェック：成功。主WebPは各56KB未満。既存予算は変更していない。
- SVG：XML構文、title、desc、同等の本文情報を確認。
- リモートのGitツリーは検証したローカルツリーと一致：1e01843df39cdde9be9485661f29fd529de9d86e（報告翻訳前）。
- GitHub Actionsの標準Chromiumを含むValidate content実行46080207017は、コミット3211f7aab954849ad32c12324e441a50f5d8616aで成功。報告翻訳後のコミットもCIを確認する。

## マージ・公開前の確認

1. GitHub公式接続の読み書きを確認済み。チャットでの認証情報共有や追加のCLI認証は不要。
2. 最新mainとPR／Issueを再確認し、共通生成物の差分があれば再生成する。
3. 最終コミットのCIとレビュー内容を確認する。
4. Protect mainが定める外部承認1件を満たす。追加の母語話者校閲は推奨するが、このAI支援レビューを人間による認証とは表示しない。
5. 承認後にマージした場合、既存のデプロイとそのSHA、対象ページ・画像を本番で確認する。

インフラ、認証情報、権限、デプロイワークフローは変更していない。有料の外部画像APIは使っていない。連絡は承認されたプロジェクトのIssue／PR内の記録に限定する。

## 画像の由来と生成仕様

プロジェクト自身の旧主画像を参考に、ChatGPT内蔵の画像生成で独自の編集イラストを作成。外部の写真は取得していない。意味内容を変更せず配信用の各サイズへ書き出し、本文SVGは正確なテキストを含む編集可能な図として作成した。以下は再現・追跡用の生成プロンプト原文を保持する。

### 職場会話の主画像

> Use case: style-transfer. Edit target: the supplied J-Connect workplace conversation cover. Create a replacement 16:9 editorial cover illustration about colleagues communicating at work in German. Preserve the subject of three adult colleagues having a calm, collaborative conversation around an office table, but simplify the entire composition for a small mobile article thumbnail: make the three people and their gestures large and central, show a single open notebook and a laptop on the table, and a quiet light office background. Use a polished contemporary editorial illustration style with natural human proportions, refined flat color and subtle paper texture, restrained navy, teal and warm neutral tones. Make it unmistakably an illustration, not a documentary photograph. Remove all writing, labels, charts, glyphs, letters, slogans, logos and decorative diagrams from the original. No on-image text, no watermark. Keep every important person and gesture inside the central 75 percent so responsive cropping preserves the subject. Wide landscape 16:9.

### 電話の主画像

> Use case: style-transfer. Edit target: the supplied telephone-language article cover. Create a replacement 16:9 editorial illustration about making a telephone appointment in German. Keep the subject of preparing for a phone conversation at a desk, but replace the busy written notes and fabricated phone UI with a clean, memorable illustrated scene: an adult seated at a simple light desk holds a smartphone to their ear and makes a brief note with a pen, with one small blank appointment calendar nearby. Make the person, phone and writing hand the large central visual subject so it remains clear at a 240px thumbnail. Polished contemporary editorial illustration with natural human proportions, subtle paper texture, navy, teal and warm neutral tones matching the workplace conversation illustration from this project. Unmistakably illustrated rather than photographic. No letters, numbers, writing, logos, slogans, watermarks, readable screens or documentary claims. No anatomy errors or duplicate objects. Keep critical elements within the central 75 percent of the wide landscape 16:9 composition.
