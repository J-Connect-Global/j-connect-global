# J-Connect Germany コンテンツ制作記録 — 2026年11月18日

## 実行概要

- ドイツ現地確認日：2026年11月18日
- 現行main：dd6603b3937828ef7201910828e712d9dc317b7f
- 対象サイト：https://j-connect-global.com/germany/ja/
- 公開日本語サイトマップ：239 URL（2026年11月18日のライブ確認）
- GSC：利用不可。GSC Wizardは payment_required / subscription_required を返した。表示回数、CTR、平均順位、クエリの実測値は記載していない。
- Notionの「J-Connect Germany | Growth & Content」Project Instructions：この実行では接続が対話型認証を要求し取得できなかった。代わりにリポジトリの CLAUDE.md、記事標準、現行コード、ユーザーの指示を参照。
- 本PRは編集草稿とレビュー用差分案のみ。公開記事レジストリ、HTML、サイトマップ、canonical、hreflang、公開データ、アプリコードは変更しない。

## 第1優先：既存J-Connectタスクの確認

### 非公開メッセージ機能

公開読み取り専用ステータスAPIを確認し、次の値を取得した。

- messaging_version: 2026-11-07.1
- public_replies: true
- private_conversations: true
- inline_replies: true
- instant_publish: true
- persistent_links: true

本番の会話UIコードも読み取り確認した。

- 会話はニックネームで表示し、相手のメールアドレスは表示しない。
- メッセージ履歴を保持し、以前のメッセージの読み込み、新着の定期確認、手動更新に対応。
- メールの会話リンクは繰り返し利用できる設計。
- リンク再送フォームは、登録内容が一致した場合に会話リンクをメールで再送する。
- 送信時の通知メールが保留・再試行中の場合を画面で区別する。
- アクセスリンクの取消しと再発行、会話の終了・ブロック、通報、本人メッセージの削除機能がある。
- 公開ページには、メールアドレスが相手に表示されない旨が明記されている。

したがって、過去に報告された「メールアドレスが相手に見える」「サイト内で複数往復できない」「リンクを再利用できない」というコード・UI上の課題は、現在の本番実装では解消されていると判断した。

**未解決の検証**：Apps Scriptエディタの認証済み管理セッションがないため、5分間隔の時間主導トリガーの存在・最終実行時刻・実行失敗履歴は確認できない。専用テスト受信箱がないため、実メールの送受信・再送のE2Eは実行していない。公開APIの成功を実メール配信の証拠とは扱わない。トリガー削除・再作成や再デプロイは行っていない。

### 画像監査

過去の画像監査PR #361はマージ済み。ただし、後から追加された記事の画像をレジストリと本文で再点検したところ、次の重複が残っている。

- birth-procedures-germany.webp：L046、L051、L110、L115
- japanese-resident-paperwork-editorial-v1.webp：L001、L111、L112
- german-clinic-reception-editorial-v1.webp：L003、L113、L114

特にL110〜L115は2026年11月14日公開の新しい記事群で、異なる検索意図の記事に同じヒーロー画像が割り当てられている。今回は画像ファイル・本文・生成HTMLを変更していない。次の画像作業では、各記事に固有のオリジナル画像を用意し、alt・キャプション・クレジットを同時に更新する。学習語彙や分類データは変更しない。

### 既存PR・作業競合の確認

GitHubのopen PR検索で8件を確認。open issueは0件。

| PR | 現状 | 今回の扱い |
| --- | --- | --- |
| #492 冬季歩道・日本向け郵便 | Draft。11月18日付の新しい更新。検証済みソースを使い、生成ファイル同期済み | L073の郵便更新を重複させない |
| #481 既存5記事の個人事例削除 | Draft。生成HTML等を同期済み。現HEADのCIは成功 | L110〜L114の本文編集と競合する変更を加えない。画像重複は別の画像専用差分として扱う |
| #490 暖房故障ガイド | Draft。公開前の法律レビュー条件あり | 新規の暖房記事を作らない |
| #486 スマホのホーム画面 | Draft。ブラウザテスト147件中145件成功。残り2件は本番求人データ内のテストレコードが原因との記録 | 本番求人データを勝手に非公開・削除しない |
| #480 住民登録ガイドの3か月特則 | DraftではないがGitHubのmergeable判定がfalse | 競合を解消せず、マージしない |
| #479 90日到着チェックリスト | Draft。ニュースレター配信事業者、送信者情報、同意フロー、配布承認が未決 | ユーザー決定なしに配信・公開しない |
| #442 社会保険基準額等 | Draft。競合あり。法令審議・法務/医療レビュー条件あり | #447と重なる変更を追加しない |
| #447 NRW就学・消費者信用・税務更新 | Draft。競合あり。法務・税務レビュー条件あり | 既存草稿を再生成しない |

## 第2優先：日本語コンテンツ制作

### 新規草稿

**「ドイツの偽通販サイトを見分ける｜ブラックフライデー前の7項目と、支払ってしまった後の対応」**

- サイトの既存記事に「偽通販サイト」専用のURLは見当たらない。
- 既存C028は14日間の撤回、返品送料、値下げ表示が主題。新草稿は購入前の偽サイト判定、前払い詐欺、支払い後の初動が主題で、検索意図を分離できる。
- 消費者センターのFakeshop-Finderの緑・黄・赤の意味を正確に説明し、緑を安全保証と誤解させない。
- 銀行振込・口座振替・カード・決済サービスで初動を分け、回収可能性を断定しない。
- 公開前の草稿のみ。レジストリ・サイトマップ・検索インデックスには未追加。

### 既存記事の更新提案

1. **C028 ネット通販の撤回・返品**：価格表示規則第11条の30日最低価格ルールについて、適用範囲と例外を明記する。現行の短い説明は、すべての価格比較に適用されるように読めるため修正が必要。
2. **N034 自動車保険の乗り換え**：通常解約の11月30日と、保険契約法第40条の特別解約を分離し、特別解約の効力は値上げ適用日より前にはならないことを追加する。

更新案はレビュー用ファイルに記載したが、公開記事にはまだ適用していない。生成HTML・レジストリ・サイトマップを同期する完全ビルドが必要なため、本文だけを変更して不整合を作ることは避けた。

## 調査した一次情報・確認日

- 消費者センター Fakeshop-Finder：https://www.verbraucherzentrale.de/fakeshopfinder-71560 （2026-11-18確認）
- 消費者センター 偽通販サイトの見分け方：https://www.verbraucherzentrale.de/wissen/digitale-welt/onlinehandel/abzocke-online-wie-erkenne-ich-fakeshops-im-internet-13166 （2025-06-11掲載）
- 消費者センター 支払い後の回収方法：https://www.verbraucherzentrale.de/wissen/digitale-welt/onlinehandel/internetbetrug-so-koennen-sie-versuchen-ihr-geld-zurueckzuholen-33155 （2026-08-03更新）
- 警察の犯罪予防案内 前払い詐欺：https://www.polizei-beratung.de/themen-und-tipps/sicher-handeln/onlinebetrug-maschen/vorkassebetrug/ （2026-11-18確認）
- NDR 偽通販サイト対策：https://www.ndr.de/ratgeber/verbraucher/fakeshops-so-koennen-sie-sich-schuetzen%2Cfakeshop104.html （2026-09-02更新）
- 価格表示規則第11条：https://www.gesetze-im-internet.de/pangv_2022/__11.html （2026-11-18確認）
- 保険契約法第40条：https://www.gesetze-im-internet.de/vvg_2008/__40.html （2026-11-18確認）
- 消費者センター 自動車保険：https://www.verbraucherzentrale.de/wissen/geld-versicherungen/weitere-versicherungen/kfzversicherung-ueberpruefen-und-mehrere-hundert-euro-sparen-11490 （2025-10-08更新）
- ADAC 自動車保険の乗り換え：https://www.adac.de/produkte/versicherungen/ratgeber/kfz-versicherung-wechseln/ （2026-10-01現在）
- Deutsche Bahn Deutschlandticket契約変更：https://www.bahn.de/faq/pk/angebot/regionale-angebote/deutschland-ticket/vertragsaenderungen-dt （2026-11-18確認）

## SEO・実装・検証

- 既存URL・canonical・hreflang・サイトマップ・公開データ・画像・アクセシビリティ・投稿/求人/フォーム・管理システム・学習語彙・プライバシー処理に変更なし。
- 新規草稿は公開URLにしていないため、検索インデックスやサイトマップへの追加なし。
- GSCの実測値は取得不可。推定値は記載しない。
- このPRは文書草稿のみのため、公開ページの表示速度・モバイルUI・構造化データの変更なし。PRのValidate contentワークフローでリポジトリ全体のビルドとブラウザーテストを確認する。

## 次の実行候補

1. #481の5記事について、固有のヒーロー画像を制作し、画像・alt・キャプション・クレジットを一括更新する。
2. #492のCI結果と公開前レビュー条件を確認する。
3. 11月20日の連邦参議院審議後、#442の2027年社会保険基準額を原典で再確認する。
4. 11月27日のブラックフライデー前に、偽通販サイト草稿とC028の差分を編集レビューし、公開承認があればコンテンツレジストリへ昇格する。
