# J-Connect Germany コンテンツ制作記録 — 2026-11-18

## 実行時点と対象

- ドイツ現地確認日時：2026年11月18日 04:03 CET
- 対象サイト：<https://j-connect-global.com/germany/ja/>
- 実リポジトリ：<https://github.com/J-Connect-Global/j-connect-global>
- 候補リポジトリ `NihonGatewayGermany/nihon-gateway-germany` は現行の実体として確認できず、J-Connect-Global/j-connect-global を使用
- Notion上の「J-Connect Germany | Growth & Content」Project Instructions は、この実行環境から取得できず。リポジトリ内の `.github/agents/`、`docs/content-production-workflow.md`、`docs/trust-and-legal-checklist.md` を参照
- ライブサイトのサイトマップは239 URL。公開対象は日本語パス配下で、英語・ドイツ語の未完成ページを追加していない
- Search Console/GSC Wizard はサイト一覧取得時に `payment_required` を返したため、28日・3か月の実測値は取得できず。表示回数・CTR・平均順位を推測で補っていない

## 既存作業の優先確認

- PR #351（掲示板の通知リンク修正）と #355（ドイツ語学習の音声再生UI）はマージ済み。#351 の本番デプロイ記録も確認
- PR #491（AIチャット関連）はマージ済み。main の最新コミットと Pages デプロイ結果を確認
- PR #481（未確認の個人事例を一般的な手順へ置換）は、検証スクリプトが「在住者の実例」見出しを必須にしていたため不一致。実体験がない場合に仮想体験を要求しないよう、検証ルール・記事標準・テンプレートを更新。最新の検証ワークフローは成功。PRはDraftのまま、公開・マージは未実施
- PR #486（モバイルUI）は既存の求人テストデータに関するブラウザテスト失敗が残る。求人データは変更しないという指示に従い未変更
- PR #480（住民登録の短期滞在例外）は古いbaseとの競合状態。法的な本文と生成HTMLの差分を再確認するまでマージしない
- PR #479 はニュースレターの配信方式・形式の判断が未確定
- PR #442、#447 は複数記事・生成ファイルを含む古い大規模PRで、mainとの差分と重複・競合の整理が必要
- PR #490（賃貸住宅の暖房故障）は法的レビューが必要なDraft。今回の雪かき記事とは検索意図を分け、重複制作していない
- ユーザー投稿、求人データ、フォーム、管理システム、ドイツ語学習語彙、プライバシー処理は変更対象外

## 今回のコンテンツ判断

新規記事は追加していない。雪かき・凍結対策の検索意図を扱う公開済みコラム C027 が既に存在するため、新規URLを増やすとカニバリゼーションが起きる可能性がある。代わりに C027 を実質的に更新し、季節直前の重要情報を既存のURLに集約した。

### 更新対象1：C027 — 雪かき・凍結対策

変更内容：
- NRW州法第1条第2項・第4条の関係を精密化。第4条は歩道清掃の移管を認め、冬季管理は別途規定する仕組みであることを明記
- デュッセルドルフ（歩道幅1m）、ケルン・エルクラート（1.5m）の現行ルールを比較
- エルクラート市の2026年1月版条例と道路一覧を追加。歩道と車道の担当を区別
- 借主の当番義務は賃貸契約の明確な条項を確認する構成に変更
- 連邦通常裁判所 VIII ZR 250/23（判決日2025-08-06、報道発表187/2025・2025-10-15）を追加。敷地内の共用通路と公道の歩道を区別し、差し戻しであることも明記
- 継続降雪時の対応、塩の例外、道具・代替要員の確認を具体化
- 既存のJ-Connect図解2点を更新し、外部画像を追加せず、権利・ライセンス上の不確実性を回避
- 関連する冬タイヤ・暖房換気ガイドへの内部リンクを整理

### 更新対象2：L073 — ドイツから日本へのクリスマス郵便

変更内容：
- Deutsche Postの2026年クリスマス締切（手紙・はがき11月25日、小包11月26日、Express12月18日）を11月18日に再確認
- DHLの日本向け料金表で日本がゾーン7に含まれることと、記事掲載料金を再確認
- 国際手紙のコンパクト料金（50gまで1.80ユーロ）を補足
- 2026年1月1日から国際書留は書類専用となり、商品・贈り物は送れないというUPUルールを追加
- 期限後の再確認日を11月27日に設定

## 競合・検索意図

- 雪かき記事：ドイツ借家人連盟の一般解説と、各自治体の条例・案内を比較。J-Connectでは日本語で「公道の歩道／敷地内の通路／賃貸契約」を分け、NRW3市の幅・時間・塩の違いを示す
- 郵便記事：Deutsche Post/DHLの公式締切・料金ページを優先し、国際書留の2026年ルールを追加
- 既存URLを維持し、新規の類似記事は作成しない

## 一次情報・確認日

- NRW州道路清掃法 §1・§4：<https://recht.nrw.de/system/files/BH/4246-1689.htm>（2026-11-18確認。§4だけで冬季管理の義務が自動移管されるとは記載せず、市条例で別途確認）
- エルクラート市条例（2026年1月版PDF）：<https://www.erkrath.de/system/files/2026-01/66.3-Satzung%20Stra%C3%9Fenreinigung%20und%20Stra%C3%9Fenreinigungsgeb%C3%BChren.pdf>（2026-11-18確認。改正履歴の最新項目は2025-12-18、2026-01-01施行）
- デュッセルドルフ市：<https://www.duesseldorf.de/umweltamt/umwelt-und-verbraucherthemen-von-a-z/strassenreinigung/winterdienst>（2026-11-18確認）
- ケルン市：<https://www.stadt-koeln.de/artikel/06397/index.html>（2026-11-18確認）
- ケルン市条例（2025-12-17版）：<https://www.stadt-koeln.de/mediaasset/content/satzungen/strassenreinigungssatzung_20251217.pdf>（2026-11-18確認）
- 連邦通常裁判所・報道発表187/2025：<https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025187.html>（発表2025-10-15、対象判決2025-08-06）
- ドイツ民法典 §535：<https://www.gesetze-im-internet.de/bgb/__535.html>
- ドイツ民法典 §278：<https://www.gesetze-im-internet.de/bgb/__278.html>
- ドイツ借家人連盟：<https://mieterbund.de/aktuelles/meldungen/winterdienst-bei-eis-und-schnee/>（2026-01-07公開、2026-11-18確認）
- Deutsche Post・2026年クリスマス締切：<https://www.deutschepost.de/de/w/weihnachtspost.html>（2026-11-18確認）
- DHL・2026年クリスマス締切：<https://www.dhl.de/de/privatkunden/kampagnenseiten/weihnachten.html>（2026-11-18確認）
- Deutsche Post・2026年1月からの国際書留ルール：<https://www.deutschepost.de/de/hilfe-kundenservice/post-international/zollinformation/neuerungen.html>（2026-01-01施行、2026-11-18確認）
- DHL・国際料金（日本はゾーン7）：<https://www.dhl.de/de/privatkunden/pakete-versenden/weltweit-versenden/preise-international.html>（2026-11-18確認）
- Deutsche Post・国際手紙料金：<https://www.deutschepost.de/de/b/briefe-ins-ausland/brief-postkarte-international.html>（2026-11-18確認）

## 実装・公開の状態

- 今回の変更は専用ブランチ上のDraft PRとして準備
- 本番サイトへのデプロイ・マージは行わない
- 生成HTML、検索インデックス、サイトマップはリポジトリのビルド手順で同期
- SEO確認対象：title/description、見出し、構造化データの更新日、内部リンク、canonical、sitemap、hreflang、モバイル表示
- GSCの実測値は取得できず
