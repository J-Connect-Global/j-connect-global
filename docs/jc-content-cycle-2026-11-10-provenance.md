# J-Connect Germany コンテンツ制作記録 — 2026年11月10日

## 実行概要

- 確認日時：2026年11月10日 04:31（Europe/Berlin）
- 対象サイト：<https://j-connect-global.com/germany/ja/>
- リポジトリ：<https://github.com/J-Connect-Global/j-connect-global>
- 現行正規URL配下のサイトマップ：220 URL（うちドイツ語圏向け日本語コンテンツページを含むドイツ語版ディレクトリ配下210 URL）
- Search Console：GSC Wizardはサブスクリプション要件で利用不可。実測表示回数・クリック・CTR・順位は取得していない。
- プロジェクト指示：NotionのProject Instructionsはこの実行環境では対話入力が必要となり取得できなかった。リポジトリ内の `.github/agents/jconnect-content.agent.md` と `docs/content-production-workflow.md`、現行サイトを基準にした。
- ブラウザー：公開ページの取得は可能だったが、TinyFishの残高が -$0.12 で、サインイン済みプロファイルもない。Google Apps Script、Googleアカウント、Search Consoleの認証が必要な確認は実行していない。

## 優先順位1：既存タスクの再開・状態確認

### 完了したもの

- PR #443「Fix next-date sorting for Germany home event cards」を2026年11月10日にsquash merge。マージコミット：`7bad7b3f0d9b2b34c0e1c5b6f17d841f888e1619`。
- 同コミットのGitHub Actionsで「Deploy GitHub Pages」「Validate content」「Sync public data」「Notify IndexNow」はすべてsuccess。
- mainの `germany/ja/index.html` では、ホームのイベントカードが11月11日、11月11日、11月13日の順に出力されることを確認。公開ページの検索用テキスト取得には旧順序（11月27日、11月23日、11月16日）が残っており、キャッシュまたは取得元の不一致が疑われる。GitHub Pagesのデプロイ成功とmainの生成HTMLは確認済みだが、外部ブラウザーでの完全なライブ再確認は未完了。
- PR #351（通知メールのプレーンテキストURL修正）、#345（掲示板返信・非公開会話リンク）、#327（ドイツ語フラッシュカード品質・学習ダッシュボード）はすでにmerged。再オープン不要。
- 旧候補 `NihonGatewayGermany/nihon-gateway-germany` はGitHub側で現在の `J-Connect-Global/j-connect-global` に正規化されることを確認。現行リポジトリはpublic、mainが既定ブランチ。ルートREADME.mdは存在せず、リポジトリ内の編集指示とワークフロー文書を参照。

### 未完了・権限待ち

- PR #442はDraftのまま。今回L097の社会保険基準額草稿を修正したが、PRのmergeable_stateはdirty。PR #443のマージ後にベースとの差分競合が残っている。
- L098「子どもの健診U1〜U9」は医療・健康情報のため、公開前に専門家レビューと権利確認済み画像が必要。今回も公開していない。
- PR #442のL003健康保険ガイド、N025平均追加保険料率、N039放送負担金の更新はPRブランチに存在するが、未マージのため本番未反映。
- Apps Scriptの本番トリガー・メール通知のE2E再確認は、Googleにサインイン済みのブラウザープロファイルがなく、TinyFish残高もマイナスのため実行できなかった。実在ユーザーへのテストメールは送信していない。

## 優先順位2：調査と記事品質改善

### 新規・更新候補の判断

- 2027年社会保険基準額の記事L097は、既存のPR #442にある草稿を継続。新しい重複記事は作らなかった。
- 子どもの健診U1〜U9の記事L098はPR #442にあるが、専門家レビュー待ち。医療情報のため公開しない。
- 最低賃金単独記事は、既存の2027年1月変更まとめとMinijob記事の検索意図を重ねる可能性があるため、今回新規作成しない。
- 有給休暇の独立記事も、既存の雇用契約ガイドと未消化休暇記事とのカニバリゼーション調査が不十分なため、今回は新規作成を見送った。

### L097で見つかった重要な誤りと修正

当初草稿は「健康保険・介護保険の保険料算定上限」を一括して月額6,375ユーロと記載していた。これは、介護再編法案（PNOG）の成立を前提にした数値であり、現行法と法案を混同するため修正した。

- 公的健康保険：2027年の予定上限は月額6,375ユーロ（年額76,500ユーロ）。社会保険基準額政令案は2026年10月7日に閣議決定され、11月10日時点では連邦参議院の同意・正式公布前。
- 介護保険：現行法の社会法典第11編第55条第2項は社会法典第5編第6条第7項の年収基準を参照するため、現行法上の2027年上限は月額6,075ユーロ（年額72,900ユーロ）。
- 介護再編法案が成立すれば、介護保険の上限も月額6,375ユーロへ引き上げる案。法案21/8869は11月2日に連邦議会へ提出され、11月5日に第1読会。11月10日時点で未成立。

### 既存記事の更新提案を追加

- N029「介護保険改革」：11月5日の第1読会を過去形にし、法案21/8869の審議状況、現行法6,075ユーロと法案成立時6,375ユーロを区別する更新提案を追加。
- L083「病欠・子どもの看病」：2026年の時限的特例15日と、2027年の通常ルール10日（追加延長がなければ）を区別し、診断書の「3暦日超・翌勤務日」の表現を明確化する提案を追加。
- C033「聖マルティン祭」：11月10日当日のデュッセルドルフ旧市街行列、11月11〜13日のメーアブッシュ市行事を自治体資料で再確認。一般参加が明示されないKita主催行事は一般公開イベントとして掲載しない提案を追加。

### 既存PR #442に残す更新

- L003：健康保険の2027年加入義務ラインと保険料算定上限の説明
- N025：平均追加保険料率2.9％の2026年10月30日付決定と、保険者別料率の区別
- N039：2026年11月8日開始の放送負担金データ照合の説明
- L097：社会保険基準額の新規草稿（今回修正）
- L098：子どもの健診記事草稿（専門家レビュー・画像確認待ち）

## 一次情報と確認日

- BMAS：2027年社会保険基準額の閣議決定（2026-10-07）  
  <https://www.bmas.de/DE/Service/Presse/Pressemitteilungen/2026/bundeskabinett-beschliesst-sozialversicherungsrechengroessen-2027.html>
- 社会法典第11編第55条（現行の介護保険上限）  
  <https://www.gesetze-im-internet.de/sgb_11/__55.html>
- BMG：介護再編法案FAQ  
  <https://www.bundesgesundheitsministerium.de/service/gesetze-und-verordnungen/guv-21-lp/pnog>
- 連邦議会：法案21/8869（2026-11-02）  
  <https://www.bundestag.de/presse/hib/kurzmeldungen-1230676>
- 連邦議会：第1読会（2026-11-05）  
  <https://www.bundestag.de/dokumente/textarchiv/2026/kw45-de-pflegeneuordnungsgesetz-1225076>
- BMG：2027年平均追加保険料率2.9％決定（2026-10-30）  
  <https://www.bundesgesundheitsministerium.de/presse/pressemitteilungen/zusatzbeitragssatz-gkv-2027-festgelegt>
- BMG：子どもの看病休暇・看病傷病手当金FAQ（2026-02-10）  
  <https://www.bundesgesundheitsministerium.de/fragen-und-antworten-zu-kinderkrankentagen-und-kinderkrankengeld>
- メーアブッシュ市：2026年聖マルティン行列（2026-10-30）  
  <https://meerbusch.de/aktuelles/nachrichten/details/sankt-martin-in-meerbusch-starten-die-zuege-am-sonntag>
- デュッセルドルフ市：旧市街行列（2026-11-02）  
  <https://www.duesseldorf.de/medienportal/pressedienst-einzelansicht/pld/sankt-martin-reitet-wieder-durch-die-stadt-12>

## GSC・SEO・競合調査

- GSC実測値：取得不可（GSC Wizardの利用要件を満たせず）。表示回数・クリック・CTR・平均順位を推定していない。
- サイトマップ：220 URLを確認。既存URLを重複制作しない方針。
- 競合調査：ドイツ年金保険の2026年10月8日付案内は健康保険と介護保険を一括して6,375ユーロと記載。Barmerの公開案内も一括表示。一方、Germany-Rechnerは現行法の介護保険6,075ユーロとPNOG成立時6,375ユーロを区別している。日本語検索ではこの区別を正確に説明する記事が少なく、L097で法的な違いを丁寧に示す価値がある。
- canonical、hreflang、robots、画像、投稿・求人・プライバシー関連コードは変更していない。

## 次回の候補

1. 11月20日の連邦参議院審議後に社会保険基準額政令の最終値を再確認。
2. PNOGの委員会審議・採決日程と、介護保険上限・子どものいない人の上乗せの法的状態を再確認。
3. PR #442の競合解消（mainへのrebase相当）を行う場合は、L098の医療レビューと画像確認を分離して扱う。
4. 11月14日にC033の終了済み行事を除外。
5. 2027年の保険者別追加保険料率の公表後にN025を再確認。
