# J-Connect Germany — 調査・作業記録（2026-11-09）

## 実行日時・対象

- 確認日時：2026年11月9日 04:24〜（Europe/Berlin）
- 対象サイト：https://j-connect-global.com/germany/ja/
- 現行リポジトリ：J-Connect-Global/j-connect-global
- 指定候補 NihonGatewayGermany/nihon-gateway-germany：GitHubのリポジトリ参照は現在のJ-Connect-Global/j-connect-globalへ解決される。別の独立リポジトリとして扱わない。
- ルートREADME.md：存在しない。記事制作方針は .github/agents/jconnect-content.agent.md と docs/content-production-workflow.md、docs/article-images.md、既存コードを参照。
- J-Connect Germany | Growth & Content のProject Instructions：Notion検索が非対話実行でユーザー入力を要求し、取得できなかった。リポジトリ内の運用指示と今回のユーザー指示を優先した。

## 1. 優先度1 — 既存J-Connectタスク

### 既存PR・GitHub状態

- open PRは #442 と #443。
- PR #442：2027年社会保険基準額の新規草稿L097と、L003・N025・N039の既存記事更新を含む。Draftのまま継続し、今回の新規草稿L098と3件の更新提案を同じブランチへ追加した。重複する別PRは作成していない。
- PR #443：終了済みイベントE024をホームの表示対象から外す変更。レビュー可能状態で、マージ・本番反映は未実施。公開ホームページでは旧カードが残っているため、PRがマージされるまで本番のホーム表示は変わらない。
- open issue検索では未解決issueを確認できなかった。
- mainのサイトマップは220 URL。コンテンツregistryは生活・手続き89件、ニュース・イベント107件。220はサイト全URL数であり記事数ではない。
- 本番のトップページcanonical、robots index/follow、モバイルviewportを確認。正規サイトマップは https://j-connect-global.com/sitemap.xml 。

### 掲示板・非公開会話

- 本番の読み取り専用ステータスAPIを再取得。応答は messaging_version=2026-11-07.1、public_replies=true、private_conversations=true、inline_replies=true、instant_publish=true、persistent_links=true、api_version=2026-07-13.1。
- これは非公開会話の永続リンク機能を含むバックエンド版が本番で応答していることを確認するもので、実メール配送やApps Scriptトリガーの状態までは示さない。
- 5分トリガーの登録・最終実行時刻は公開ステータスAPIから取得できない。Apps Script管理者セッションで inspectCommunityPublicationSync() を実行する必要がある。
- Zohoの実メールE2Eは安全なテスト専用受信箱が確認できず、実行していない。実利用者宛てのテストメールも送信していない。
- ブラウザの認証済みGoogleプロファイルが利用できず、Apps Script管理画面へのサインイン・トリガー変更は行っていない。

### German-learning音声

- 過去PR #424はマージ済み。自動読み上げ初期OFF、手動再生の状態表示、停止・エラー表示はコードとテストで確認済み。
- 実端末のスピーカー出力は未確認。PlaywrightのSpeechSynthesisモックは実音声の証明にならない。
- 既存の求人、ユーザー投稿、連絡フォーム、管理、学習語彙・分類、プライバシー処理には変更を加えていない。

### 優先度1の結論

公開APIで確認できる非公開会話の永続リンク実装は本番に反映されている。残るのはApps Scriptの5分トリガー確認、Zoho実メールE2E、実端末の音声確認、PR #443のレビュー・マージである。これらは認証・テスト資源または公開承認が不足しているため、未完了のまま維持した。

## 2. コンテンツサイクル — 新規テーマと重複確認

### 新規草稿L098

**タイトル：** ドイツの子どもの健診U1〜U9｜受診時期、黄色い冊子、予防接種の確認  
**slug案：** child-health-checks-u1-u9-germany  
**状態：** docs/draftsの完成原稿。未公開、registry未登録、canonical・sitemap・検索インデックス未追加。

検索意図：
- U1〜U9の具体的な受診時期を知りたい
- U2を自宅出産・外来出産・早期退院後にどこで受けるか
- 黄色い健診冊子、電子版、歯科健診Z1〜Z6の扱い
- Kita入園時の予防接種相談証明と麻疹証明の違い
- 2026年に決定された新U10がいつから実施されるか

競合比較：
- Young Germanyの日本語記事（2023年9月26日）はU1〜U9の基本スケジュールと一家庭の体験談が中心。2026年のZ1〜Z6、eU-Heft、新U10決定、麻疹証明とKita入園時の相談証明の区別は扱っていない。
- SettledInのドイツ語記事はU1〜U9、黄色い冊子、Z1〜Z6を個別に説明している。日本語の読者が使える、出産直後の予約フロー、外国語の接種記録、保育施設提出書類を一体で説明する余地がある。
- 既存J-ConnectのL046は出生届・保険・手当・国籍など出産手続きが主題、L008は妊娠・出産全体、L009はKita申込みが主題。L098は乳幼児健診・健診記録・予防接種証明の検索意図に限定し、重複を避ける。

競合・参照：
- https://www.young-germany.jp/2023/09/doitsukennshin/
- https://www.settledin.eu/de/germany/u-untersuchungen-schedule-u1-u9/
- https://www.settledin.eu/de/germany/u-heft-explained/

### 既存記事の改善提案3件

1. **L046 出産手続きガイド**：2026年版の黄色い冊子、Z1〜Z6、eU-Heft、U2・U3予約を補足。L098が公開承認された後に内部リンクを追加する案。未公開記事へのリンクは現行本文へ追加していない。
2. **N021 Deutschlandticket 2027**：連邦政府の2026年11月5日付FAQを追加し、66.80ユーロへの全国価格変更と、DBの11月30日という事業者固有期限を区別する案。
3. **C033 聖マルティン祭**：2026年11月7日のイルヴェリッヒ行列は終了済みのため、今後の予定一覧から削除。11月9日現在の情報へ更新し、保育施設主催で一般公開が確認できない行事は公開イベントとして案内しない案。

### 既存記事の再検証のみ

- L093「日本からドイツに届く荷物の関税」：EU規則2026/2108、第20条、委任規則2026/2152、EU理事会・欧州委員会の案内を照合。2ユーロの取扱手数料（2026年11月1日から）と3ユーロ定額関税（2026年7月1日から）の区別、対象となる通販と個人間ギフトの違いは現行記事の説明と整合。今回は重複する更新を行わず、次回の確認対象として維持。
- N038 THG期限：2026年11月15日が日曜日となる点と行政期限の扱いは慎重な説明が必要。現行記事は公式の明示的な延長確認がない点を注記しており、今回は結論を推測して変更しない。

## 3. 新規草稿の一次情報・重要な日付

### U1〜U9の受診期間

- BIÖGの受診時期一覧：U1は出生直後、U2は生後3〜10日、U3は生後4〜5週、U4は3〜4か月、U5は6〜7か月、U6は10〜12か月、U7は21〜24か月、U7aは34〜36か月、U8は46〜48か月、U9は60〜64か月。
- BIÖGのU2案内は2026年8月26日更新。病院でU2を受けない自宅・外来出産等では、保護者が診療所へ予約する必要があり、新生児スクリーニング未実施なら出生後1〜2日以内に連絡するよう案内。
- BIÖGのU3案内は2026年8月26日更新。U3は4〜5週で、出生後できるだけ早く診療所へ予約するよう案内。

### 2026年の黄色い冊子・歯科健診

- BIÖGの黄色い冊子案内（2026年1月17日更新）は、法定保険者と多くの民間保険者がePA内の電子版eU-Heftを提供すると説明。
- 2026年1月1日から、歯科健診Z1〜Z6の結果が黄色い冊子に記録される。G-BA決定7233は2026年1月1日施行。
- 参加証明カードはU健診の受診状況を示すためのもので、冊子全体の医療情報を第三者へ見せることとは別。

### 新U10とJ1

- G-BAは2026年8月20日に9〜10歳向けの新U10とJ1の冊子記録を決定。
- G-BA決定7982のページは2026年11月9日時点で「まだ発効していない」と表示。
- G-BAは、BMGの法的確認、官報掲載、医師報酬を定める手続きの後に実施可能と説明。新U10が既に始まったとは記載しない。
- J1自体は13〜14歳向けのまま。J1記録の追加も新決定の発効前に実施済みと扱わない。

### 予防接種・Kita入園

- RKIの2026年版STIKOカレンダーを参照。RSV流行期に生まれた新生児は、モノクローナル抗体による予防を出生後できるだけ早く、理想的には退院時またはU2で行うよう案内されている。個々の対象・製剤・時期は医師が確認する。
- IfSG §34(10a)：Kitaへの初回入園時には、年齢に合った予防接種について医師の相談を受けた書面証明が必要。
- IfSG §20(8)：対象施設に入る子どもは、1歳以上で少なくとも1回、2歳以上で少なくとも2回の麻疹ワクチン、または免疫の証明が必要。医学的禁忌の例外あり。
- 予防接種相談の証明と麻疹証明を混同しない。

### 一次情報URL

- https://www.bundesgesundheitsministerium.de/themen/praevention/kindergesundheit/frueherkennungsuntersuchung-bei-kindern
- https://www.kindergesundheit-info.de/themen/frueherkennung-u1-u9-und-j1/untersuchungstermine/
- https://www.kindergesundheit-info.de/themen/frueherkennung-u1-u9-und-j1/das-gelbe-heft/
- https://www.kindergesundheit-info.de/themen/frueherkennung-u1-u9-und-j1/untersuchungen-u1-bis-u9/u2-untersuchung/
- https://www.kindergesundheit-info.de/themen/frueherkennung-u1-u9-und-j1/untersuchungen-u1-bis-u9/u3-untersuchung/
- https://www.g-ba.de/beschluesse/7233/
- https://www.g-ba.de/beschluesse/7982/
- https://www.g-ba.de/presse/pressemitteilungen-meldungen/1350/
- https://www.rki.de/DE/Themen/Infektionskrankheiten/Impfen/Impfkalender/impfkalender-node.html
- https://www.rki.de/DE/Aktuelles/Neuigkeiten-und-Presse/Meldungen-PM/Meldungen/2026-01-22_STIKO.html
- https://www.gesetze-im-internet.de/ifsg/__20.html
- https://www.gesetze-im-internet.de/ifsg/__34.html
- https://www.infektionsschutz.de/themen/masernschutz/eltern-und-erziehungsberechtigte/

## 4. SEO・サイト・GSC・検証

- 公開ページ、canonical、hreflang、robots、サイトマップはこの追加作業では変更していない。
- L098と3件の更新提案はdocs/draftsに置き、未公開URL、検索インデックス、サイトマップ、ホームカードを追加していない。
- 画像ガイドに沿ったヒーロー画像はまだ追加していない。医療記事のため、公開前に権利確認済みのオリジナル画像または適切なライセンス画像が必要。
- 医療情報の人手レビューも未完了。L098はDraftのまま維持する。
- GSC Wizardは有効な契約・サイトデータへのアクセスがなく、直近28日・3か月のクエリ、表示回数、CTR、平均順位を取得できなかった。実測値や検索流入改善を推測していない。
- TinyFishで公開ページと本番の読み取り専用Messaging Status APIを確認した。Googleにサインインしたブラウザープロファイルがなく、Apps Script管理画面・Zohoメールの実E2Eは実行していない。
- ローカルビルドは実行できていない。GitHub Actionsの新しい実行結果を確認してからPRの検証状態を更新する。

## 5. PR・未解決事項

- PR #442（Draft）：https://github.com/J-Connect-Global/j-connect-global/pull/442
  - 既存L097、L003、N025、N039の作業に今回のL098と3件の更新提案を追加。
  - 今回の追加ファイルはdocs/draftsのみ。公開ページの生成ファイルは変更しない。
  - 医療レビューとヒーロー画像が未完了のためDraftを維持。
- PR #443（レビュー待ち）：https://github.com/J-Connect-Global/j-connect-global/pull/443
  - 終了済みホームイベントの除外。マージ・公開は未実施。
- Apps Scriptの5分トリガーと最終実行時刻：管理者確認待ち。
- Zoho実メールE2E：安全なテスト専用受信箱待ち。
- German-learning音声：物理端末でのスピーカー出力確認待ち。
- GSC：契約・接続回復待ち。
- 2026年11月20日：2027年社会保険基準額政令の連邦参議院審議後にL097、L003の予定額を再確認。

## 6. 次回の候補

1. 11月10日：聖マルティン祭の終了済み行事削除案を再確認し、THG-Quoteの11月15日期限について公式の週末取扱いに新しい案内が出ていないか確認。
2. 11月11日：ドイツ10月インフレの確報公表後、速報記事N036の数値・説明を更新。
3. 11月20日以降：社会保険基準額政令の連邦参議院同意・公布状況を確認し、L097・L003の予定額を確定額へ更新。
4. L098の医療レビューとヒーロー画像の権利・ライセンス確認後に、公開可否とL046への内部リンクを判断。


## 2026-11-09 04:54 CET — 継続調査・既存タスクの再確認

### 1. 既存J-Connectタスク（コンテンツ制作より優先）

- PR #351（通知メール内の会話URL保持）は **2026-10-18にマージ済み**。再開対象ではない。
- PR #361（公開済み121記事のサムネイル・画像系列監査）は **2026-10-20にマージ済み**。画像監査の既存タスクは完了扱い。
- PR #365（コミュニティ投稿・通知メール）は **2026-10-21にマージ済み**。
- PR #424（学習カード音声の再生フィードバック）は **2026-11-06にマージ済み**。
- PR #432（サイト保守、軽量化、検索、Apps Scriptのコード側ハードニング、リンク監査）は **2026-11-06にマージ済み**。
- 現在の未完PRは #442 と #443 の2件。未完Issueは確認時点で0件。
- PR #443は終了済みイベント3件（11月5日、7日、8日）をホームのイベント欄から除外し、11月16日以降のイベントを繰り上げる変更。CIは前回確認時に成功しているが、PRは未マージ。実サイトのホームには終了済みカードがまだ表示される。レビュー・マージ権限の確認がないため、本番変更は行わない。
- PR #442はDraftを維持。医療記事L098の専門レビューとヒーロー画像の権利確認が未完了。Codexレビューは利用上限で完了できなかった旨のコメントがあり、レビュー合格とは扱わない。

### 2. プロジェクト指示・リポジトリ・サイト調査

- Notionの「J-Connect Germany | Growth & Content」Project Instructionsはこの実行環境から取得できなかった。
- リポジトリにREADMEは見つからなかったが、`.github/agents/jconnect-content.agent.md`、`docs/content-production-workflow.md`、`docs/article-images.md`を確認し、読者・記事品質・生成物同期・画像権利・PR運用のルールに従った。
- mainの現行レジストリはLiving 89本、Events 107本、サイトマップ220 URL。新規記事の重複確認に使用。
- 公開サイトのホームを読み取り確認。終了済みイベントが残る問題はPR #443に集約されているため、別PRを作らない。
- 今回、投稿・求人・フォーム・管理・学習語彙・分類・プライバシー関連のコードは変更していない。

### 3. 新しい一次情報の照合と編集判断

#### N038：THG-Quote 2026（期限11月15日）

- 環境庁の概要ページは2026-11-06更新。一般説明には第6条・第7条の電力量を翌年2月28日までと読むことができる記述がある。
- しかし、環境庁FAQ Q6（2025-07-17版）と38番目の連邦排出規制令第8条第1項は、非公開充電の定額推計（第7条）は当年11月15日、公共充電の計測電力量（第6条）は翌年2月28日と明確に区別する。
- 2026-11-15は日曜日。行政手続法第31条第3項の一般規定は確認したが、今回の第8条の申告期限に翌営業日扱いが適用されると明示するUBAの説明は確認できなかった。11月16日まで待てると断定しない。
- 監査・追記案を `docs/drafts/updates/thg-quote-2026-11-09-verification.md` に追加。公開記事、レジストリ、生成HTMLは未変更。

一次情報：
- https://www.umweltbundesamt.de/themen/verkehr/kraftstoffe-antriebe/vollzug-38-bimschv-anrechnung-von-strom-fuer
- https://www.umweltbundesamt.de/system/files/medien/366/dokumente/2025-07-18_uba_faq_vollzug_38._bimschv_0.pdf
- https://www.gesetze-im-internet.de/bimschv_38_2017/__8.html
- https://www.gesetze-im-internet.de/vwvfg/__31.html

#### N034：自動車保険の2027年等級

- GDVの2027年車種別等級統計（2026-09-30更新）は、賠償責任保険で1,200万人超に等級変更。約740万人は上昇、約510万人は下降、約3,000万人は変化なし。統計は保険会社を拘束せず、等級変更だけで保険料の増減は判断できない。
- GDVの2027年地域別等級統計（2026-09-09更新）は、賠償責任保険で約520万人が改善、約480万人が悪化。地域等級も複数の料金要素の一つ。
- N034には11月30日の一般期限と特別解約の説明があるため、新記事は作らず、GDVの車種別・地域別等級を追加する既存記事更新案を作成。
- 監査・追記案を `docs/drafts/updates/car-insurance-2027-typklassen-2026-11-09.md` に追加。公開記事、レジストリ、生成HTMLは未変更。

一次情報：
- https://www.gdv.de/gdv/medien/medieninformationen/typklassen-kfz-versicherung-medieninformation-147618
- https://www.gdv.de/gdv/medien/medieninformationen/regionalklassen-2027-medieninformation-69824
- https://www.adac.de/produkte/versicherungen/ratgeber/kfz-versicherung-wechseln/

### 4. 今回の実装・SEO・検証範囲

- PR #442の既存ブランチに、N038とN034の更新監査メモ2件を追加。今回の新しいコミットはドキュメントのみ。
- 公開記事のMarkdown、レジストリ、生成HTML、サイトマップ、canonical、hreflang、検索インデックス、ホームカードは今回変更していない。
- ローカルビルドは実行できていない。コンテナからGitHubへ直接接続できず、Git cloneはDNS解決失敗。GitHub ActionsのValidate contentを新しいブランチHEADに対して確認中。完了するまで検証済みとは扱わない。
- GSC Wizardは契約終了（payment_required）。直近28日・3か月の実測クエリ、表示回数、CTR、順位は取得できていない。
- TinyFishの残高は -0.12 USD。クラウドブラウザーは実行せず、公開サイトは読み取り専用のWeb確認で代替した。
- 検索流入改善、公開、デプロイは未確認であり、宣言しない。

### 5. 未解決事項と次回候補

- PR #443：レビュー・マージ待ち。マージされるまで終了済みイベントカードは本番ホームに残る。
- PR #442：医療専門レビュー、ヒーロー画像の権利・ライセンス確認、Codexレビュー利用枠、GitHub Actionsの最終結果待ち。
- Apps Scriptの5分トリガーと最終実行時刻：Google管理画面への認証がなく未確認。
- Zoho通知メールの実E2E：安全なテスト専用受信箱が確認できず未実施。
- 学習音声：物理端末での実スピーカー確認待ち。
- GSC：有効な契約・接続待ち。TinyFish：残高回復待ち。
- 11月10〜12日：THG-Quoteの週末取扱いとUBA公式説明を再確認。
- 11月11日：10月インフレ確報後にN036を再確認。
- 11月20日：社会保険基準額政令の連邦参議院審議後にL097・L003を再確認。
- 11月30日：N034の自動車保険通常解約期限。契約ごとの満了日・通知到達日を改めて確認。
