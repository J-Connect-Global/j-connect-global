# J-Connect Germany — 2026-10-25 編集改善計画

**状態：未公開の編集作業資料。**  
確認日時：2026-10-25 03:55〜04:01（Europe/Berlin）  
基準main：0a79a7ece0ff64d489fc9519437fe59e71db3f5c

## 目的と範囲

既存記事の検索意図と重複を確認し、新規記事4本を content/living/ に下書きとして保存しました。公開レジストリ、生成HTML、検索インデックス、サイトマップには追加していません。ユーザー投稿、求人、連絡フォーム、管理システム、語彙データ、プライバシー処理のコード変更もありません。

## 新規下書き

| ファイル | 提案URL（未公開） | 検索意図 |
| --- | --- | --- |
| content/living/kindergeld-auszahlungstermine-2027.md | /germany/ja/living/kindergeld-auszahlungstermine-2027/ | 2027年の児童手当送金日を番号末尾から確認する |
| content/living/epa-guide-germany.md | /germany/ja/living/epa-guide-germany/ | ePAの閲覧期間、文書の非表示、施設単位のアクセス制限を理解する |
| content/living/nrw-school-holidays-2026-2027.md | /germany/ja/living/nrw-school-holidays-2026-2027/ | NRWの学校休暇と学校ごとの移動休日、保育施設休園日の違いを確認する |
| content/living/nrw-public-holidays-2027.md | /germany/ja/living/nrw-public-holidays-2027/ | NRWの法定祝日11日、曜日、ブリッジデー、学校・Kitaの日程との違いを確認する |

4本とも status: draft、published: false で、公開レジストリには未登録です。ePA記事には、薬の一覧を施設ごとに非表示にできる例外を公式情報に基づいて追記しました。Kindergeld記事は公式支給日表の全日程を再照合し、Kindergeld記事では、保育施設の画像を申請先を整理する既存図へ差し替えました。NRW祝日記事には、他記事のサムネイルを使い回さないよう、固有のヒーローSVGと、本文用のブリッジデー・週末重複のオリジナルSVG図2点を用意しました。ヒーロー画像を本文で再掲しない構成です。公開URL、canonical、サイトマップ、検索一覧は発生しません。

## 一次情報と照合した事項

### Kindergeld

- 連邦雇用庁の公式支給日表を2026-10-25に確認。番号末尾0〜9の2027年全日程を照合しました。
- 週末・祝日には入金日が前後する場合があり、特定日の送金を保証する権利がない旨を反映しました。
- 初回支給は受給資格のある月について全額となること、遡及支給は条件付きで最大6か月であることを公式案内へのリンク付きで説明しています。
- 支給日と2027年の支給額は分け、未成立の金額案を確定額として扱っていません。

公式情報：
- https://www.arbeitsagentur.de/familie-und-kinder/auszahlungstermine
- https://www.arbeitsagentur.de/familie-und-kinder/infos-rund-um-kindergeld/kindergeld-anspruch-hoehe-dauer
- https://familienportal.de/familienportal/familienleistungen/kindergeld/faq/wie-wird-kindergeld-beantragt-und-ausgezahlt--124954

### 電子患者記録（ePA）

- 連邦保健省と連邦健康情報ポータルを確認。標準アクセス期間は医療機関が通常90日、薬局が通常3日です。
- 文書を非表示にする操作と、特定の医療機関のアクセスを制限する操作を分けて説明しています。
- アプリなしの場合は、加入先の保険者やオンブズ窓口に相談できることを案内しています。

公式情報：
- https://www.bundesgesundheitsministerium.de/themen/digitalisierung/elektronische-patientenakte/epa-fuer-alle
- https://gesund.bund.de/wie-verwalte-ich-meine-epa
- https://gesund.bund.de/die-elektronische-patientenakte

### NRW学校休暇

- 州文部大臣会議の2026/27年度カレンダーを確認。NRWの春休みは2027-03-22〜04-03、夏休みは2027-07-19〜08-31、聖霊降臨祭の休暇は2027-05-18です。
- 学校ごとの移動休日は州共通の日程表だけでは特定できないため、個別の学校予定表を確認するよう説明しています。
- 保育施設の休園日は学校休暇と同じとは限らない点を明記しています。

公式情報：
- https://www.kmk.org/service/ferienregelung/ferienkalender.html
- https://www.land.nrw/schulferien-nordrhein-westfalen

### NRWの法定祝日2027

- NRW州の「日曜・祝日に関する法律」で祝日の種類を確認し、2027年の曜日・日付を民間の祝日カレンダーでも照合しました。
- NRWでは2027年に11日の法定祝日があり、5月6日（木）のキリスト昇天祭と5月27日（木）の聖体祭の翌日を休暇にすると、土日休みの人は4連休にできます。
- 祝日が週末に重なった場合の自動的な振替休日を前提にしないよう明記。学校休暇とKitaの休園日は別途確認する構成です。

確認先：
- https://recht.nrw.de/lrgv/gesetz/01012000-bekanntmachung-der-neufassung-des-gesetzes-ueber-die-sonn-und-feiertage/
- https://www.land.nrw/schulferien-nordrhein-westfalen
- https://www.kmk.org/service/ferienregelung/ferienkalender.html
- https://www.feiertage-deutschland.de/bundesland/nordrhein-westfalen/

## 既存記事4本への改善差分案

以下は具体的な編集案です。今回のPRでは既存の公開記事ファイルを変更していません。公開済みの生成HTMLを伴わないままMarkdownだけ変更すると、ビルドとメタデータ同期に不整合が生じるためです。

### 1. 健康保険ガイド

対象ファイル：content/living/health-insurance-guide.md  
URL：https://j-connect-global.com/germany/ja/living/health-insurance-guide/

- ePAの標準アクセス期間（医療機関90日、薬局3日）を追加。
- 文書の非表示と施設単位のアクセス制限の違いを説明。
- アプリを使わない場合の相談先を追加。
- 関連記事に epa-guide-germany を追加。
- ePAの公式出典を追加。
- 記事全体の保険料基準や加入条件を再検証していないため、既存記事の last_verified は今回変更しない。

追記案：

> 電子患者記録（ePA）は、診療に関する文書や薬の情報を管理する仕組みです。医療機関の標準アクセス期間は通常90日、薬局は通常3日ですが、設定を変更できる場合があります。文書を非表示にすることと、特定の医療機関のアクセスを止めることは別です。アプリを使わない場合は、加入先の健康保険者やオンブズ窓口に管理方法を確認してください。詳細は「ドイツの電子患者記録（ePA）入門」で説明します。

### 2. 出産手続きガイド

対象ファイル：content/living/birth-procedures-germany.md  
URL：https://j-connect-global.com/germany/ja/living/birth-procedures-germany/

- Kindergeld申請の説明から2027年の支給日一覧へ内部リンクを追加。
- 支給日と支給額の情報を分ける。
- 連邦雇用庁の公式支給日表を出典に追加。

追記案：

> Kindergeldの送金日は番号末尾によって異なります。2027年の月別日程は「Kindergeld 2027年の支給日一覧」で確認できます。支給日表は振込日を示すもので、支給額の改定を確定する資料ではありません。

### 3. Kita・U3申込みガイド

対象ファイル：content/living/kita-u3-tagesmutter-guide.md  
URL：https://j-connect-global.com/germany/ja/living/kita-u3-tagesmutter-guide/

- 学校休暇と保育施設の休園日が一致するとは限らない点を追加。
- 関連記事に nrw-school-holidays-2026-2027 を追加。
- KMKとNRW州の公式カレンダーを出典に追加。
- 施設独自の休園日と代替保育の確認を促す。

追記案：

> NRWの学校休暇は州共通の日程がありますが、学校ごとの移動休日もあります。一方、保育施設の休園日は学校休暇と同じとは限らず、施設や運営者が独自に設定します。勤務先への休暇申請や代替保育を決める前に、学校と保育施設の年間予定を別々に確認してください。

### 4. 2027年1月の制度変更まとめ

対象ファイル：content/events/news/germany-january-2027-changes.md  
URL：https://j-connect-global.com/germany/ja/events/news/germany-january-2027-changes/

- Minijob-Zentraleの2026-10-07公開情報を公式出典に追加。
- 月額633ユーロ、年額7,596ユーロ、時給14.60ユーロの場合の月約43時間という目安を整理。
- 収入が変動する場合は年間見込みを確認するよう補足。
- Kindergeldの2027年支給日一覧へ内部リンクを追加。
- 既存記事の支給額表は「政府案（未成立）」と区別したまま維持。

公式情報：
- https://magazin.minijob-zentrale.de/minijob-grenze-2027/
- https://www.arbeitsagentur.de/familie-und-kinder/auszahlungstermine

## 2026-10-26 の再確認と修正

- Kindergeld 2027年の番号末尾0〜9の日程を連邦雇用庁の公式表で再確認しました。
- ePAの標準アクセス期間（医療機関90日、薬局3日）と、文書の非表示・施設単位のアクセス制限の違いを連邦保健省および連邦健康情報ポータルで再確認しました。
- NRWの2026/27年度の学校休暇日程をKMKの現行カレンダーで再確認しました。
- NRW祝日記事の出典URLが、祝日法ではなく店舗営業時間法を指していたため、NRW州の「日曜・祝日に関する法律」の公式ページへ修正しました。
- 4本の下書きについて、ヒーロー画像の代替テキスト・キャプションと実画像の不一致を修正し、本文中のテーマに合わないストック風イメージを削除しました。

## 競合・カニバリゼーション

- Kindergeldの公式ページは検索上位にあり、支給日の原典です。J-Connect側は日本語の月別一覧、初回支給、遡及申請、入金確認を一つにまとめることで用途を明確にします。
- ePAは連邦保健省と連邦健康情報ポータルが主要な一次情報源です。日本語の実用ガイドとして、アクセス設定の違いとアプリなしの場合の行動を整理します。
- NRW学校休暇はKMKの州別カレンダーが原典です。学校の移動休日と保育施設の休園日を区別することで、単なる日程転載にとどめない構成にします。
- 最低賃金・Minijobの新規記事は作りません。既存の2027年制度変更記事へ統合する方針です。

## 技術的な公開条件

このリポジトリはMarkdownとJSONレジストリを元に、記事HTML、一覧、検索インデックス、サイトマップを生成してコミットする構成です。今回のPRでは新規記事を公開レジストリに追加していないため、生成ファイルに差分はありません。公開するには、次の工程が必要です。

1. 既存記事4本の変更を実施し、公開レジストリとMarkdownを同期する。
2. 新規3記事の画像の関連性・表示・出典を最終確認する。
3. npm run build を実行し、生成HTML、ハブ、ホーム、検索インデックス、サイトマップを同期する。
4. npm run validate と npm run test:browser を実行する。
5. canonical、構造化データ、内部リンク、画像クレジット、モバイル表示、既存機能の回帰を確認する。
6. CI成功後に公開可否を判断する。

## 制約

- GSC Wizardは有効な契約がなく、28日・3か月の実測クエリ、表示回数、CTR、順位は取得できませんでした。2026-10-25にも再試行し、同じ subscription_required エラーを確認したため、これ以上の再試行はしていません。
- Gmail／Apps Scriptにサインインしたブラウザープロファイルがありません。非公開会話の実送受信、通知再送、管理リンクを使ったデータ削除は未検証です。
- 本PRは下書き保存用であり、本番公開を意味しません。
