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
2. **N021 Deutschlandticket 2027**：連邦政府の2026年10月29日付説明を追加し、66.80ユーロへの全国価格変更と、DBの11月30日という事業者固有期限を区別する案。
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

- RKIの2026年版STIKOカレンダーを参照し、個々の接種日程は医師が接種歴と年齢に基づいて確認するよう案内。
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
