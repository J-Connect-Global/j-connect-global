# J-Connect Germany — 2026-10-27 公開準備・編集改善記録

**状態：** PR #377 の公開候補。まだ本番公開されていない。  
**確認日：** 2026年10月27日（Europe/Berlin）  
**対象：** 新規日本語ガイド4本、既存記事4本

## 新規記事4本

| タイトル | 正規URL | 内容 |
| --- | --- | --- |
| Kindergeld（ドイツの児童手当）2027年の支給日一覧 | /germany/ja/living/kindergeld-auszahlungstermine-2027/ | 末尾0〜9の公式支給日、申請なし支給の段階導入、支給額法案との区別 |
| ドイツの電子患者記録（ePA）入門 | /germany/ja/living/epa-guide-germany/ | 標準アクセス期間、文書非表示、施設単位のアクセス制限、アプリなしの相談先、民間保険の確認 |
| NRWの学校休暇2026/27年度 | /germany/ja/living/nrw-school-holidays-2026-2027/ | 州共通の日程、移動休日、Kita休園日の違い、公式カレンダーの年度区分 |
| NRWの祝日2027年一覧 | /germany/ja/living/nrw-public-holidays-2027/ | 法定祝日11日、曜日、ブリッジデー、週末と重なる祝日の注意点 |

4本はPRブランチで本文・メタデータ・公開レジストリを更新した。生成HTML、検索一覧、canonical、サイトマップの同期と公開後の実URL確認は、ビルドとCIが成功してから行う。専門家レビュー待ちであることをメタデータに残し、法律・医療情報の確定助言として扱わない。

## 既存記事4本の更新

1. **健康保険ガイド** — ePAの標準アクセス期間（医療機関90日、薬局3日）、文書非表示と施設単位のアクセス制限の違い、アプリなしの場合の相談先を追加。新しいePAガイドへの内部リンクと公式出典を追加。記事全体の加入条件・保険料基準は再監査していないため、last_verified は変更していない。
2. **出産手続きガイド** — 2027年のKindergeld申請なし支給の段階導入、対象条件、例外を追加。支給日一覧への内部リンクと政府公式出典を追加。記事全体のlast_verifiedは変更していない。
3. **Kita・U3申込みガイド** — 学校休暇と保育施設の休園日は別に確認するよう説明を追加。NRW学校休暇一覧への内部リンクと州の公式規則を追加。記事全体のlast_verifiedは変更していない。
4. **2027年1月の制度変更まとめ** — 267ユーロへの支給額引き上げ案と、議会・連邦参議院の同意を経た申請なし支給の手続き改正を分けて説明。Kindergeld一覧への内部リンク、連邦政府・連邦議会の出典を追加。記事全体のlast_verifiedは変更していない。

## 一次情報の確認

### Kindergeld
- 連邦雇用庁の公式支給日表を確認し、番号末尾0〜9の2027年日程を照合。
- 送金日は番号末尾で異なり、週末・祝日には入金が前後する場合がある。特定日の送金を保証する権利があるとは書かない。
- 申請なし支給の法案は連邦議会が2026年7月9日に可決し、連邦参議院が同年9月25日に同意。2027年1月1日施行予定で、実際の自動支給は2027年3月頃に第2子以降、11月頃に第1子へ段階導入する見込み。ただし対象条件と例外がある。
- 2027年の月267ユーロ案は別の所得税改革法案で、2026年10月8日の連邦議会第1読会後に委員会審議中。確定額として記載しない。

公式情報：
- https://www.arbeitsagentur.de/familie-und-kinder/auszahlungstermine
- https://www.bundesregierung.de/breg-de/aktuelles/kindergeld-ohne-antrag-2412916
- https://www.bundestag.de/dokumente/textarchiv/2026/kw21-de-kindergeld-1174720
- https://www.bundestag.de/dokumente/textarchiv/2026/kw41-de-einkommensteuerreform-1217520
- https://www.bundesfinanzministerium.de/Content/DE/Pressemitteilungen/Finanzpolitik/2026/03/2026-03-18-antragsloses-kindergeld.html

### 電子患者記録（ePA）
- 連邦保健省と連邦健康情報ポータルを確認。医療機関の標準アクセス期間は通常90日、薬局は通常3日。
- 文書の非表示と施設単位のアクセス制限は別。薬の一覧には施設ごとに表示を制限できる例外がある。
- アプリを使わない場合は、加入先の保険者のオンブズ窓口でアクセス管理を相談できる。保険者やオンブズ窓口自身は記録内容を閲覧できない。

公式情報：
- https://www.bundesgesundheitsministerium.de/themen/digitalisierung/elektronische-patientenakte/epa-fuer-alle
- https://gesund.bund.de/wie-verwalte-ich-meine-epa
- https://gesund.bund.de/die-elektronische-patientenakte

### NRWの学校休暇・祝日
- KMKの学校休暇カレンダーとNRW州学校省の公式規則を照合。
- 春休み2027は3月22日〜4月3日、夏休み2027は7月19日〜8月31日、聖霊降臨祭の休暇は5月18日。
- 公式表では夏休み2027が2027/28年度欄に掲載されるため、年度表示に関する注記を追加。
- 祝日はNRW州の祝日法に照らして2027年の日付・曜日を確認。週末と重なる祝日に自動振替があると断定しない。

公式情報：
- https://bass.schule.nrw/191.htm
- https://www.kmk.org/service/ferienregelung/ferienkalender.html
- https://www.land.nrw/schulferien-nordrhein-westfalen
- https://recht.nrw.de/lrgv/gesetz/01012000-bekanntmachung-der-neufassung-des-gesetzes-ueber-die-sonn-und-feiertage/

## 画像・内部リンク・SEO

- 新規記事用のオリジナルSVG図解12点をPRに追加。Kindergeld記事では既存の手続き図を1点再利用。
- 新規記事の正規URL、内部リンク、公開レジストリ、検索一覧、サイトマップはビルド後に同期・検証する。
- 画像の代替テキストとキャプションは、図の実際の内容に合わせて設定。
- 記事の重複を避けるため、最低賃金・Minijobの独立記事は作らず、既存の2027年制度変更記事へ統合。
- 競合調査は公開検索のサンプルに限定。ドイツ語の制度案内は存在するが、同等の日本語一覧記事は今回の検索では確認できなかった。検索順位や流入の優位性は断定しない。

## 検証・未解決事項

- GitHub Actionsで build、deterministic validation、browser smoke tests を実行する。生成ファイルに語彙・投稿・求人・プライバシー処理の無関係な変更が出た場合は停止する。
- Search Console/GSC Wizardは前回の接続確認で subscription_required、今回の呼び出しは対話入力が必要な状態となり、実測データを取得できなかった。直近28日・3か月のクエリ、表示回数、CTR、平均順位は推測しない。
- 暗記カードは公開データ総数17,635件（A1 650、A2 650、B1 1,100、B2 2,600、C1 5,000、C2 7,635）をデッキメタデータと検証コードで確認。今回そのデータは変更しない。
- 掲示板メッセージ機能のコードテストは現行CIに含まれるが、Google Apps Scriptの本番デプロイ、実メール送受信、通知再送、元スプレッドシートのデータ削除はGoogleへのサインインが必要で未確認。
- Project InstructionsはNotionコネクターが対話入力を要求したため取得できず、公開サイト・リポジトリ・本指示を優先した。
- 本番公開は、生成HTML・canonical・サイトマップ・内部リンク・ブラウザーテストの成功を確認した後に判断する。
