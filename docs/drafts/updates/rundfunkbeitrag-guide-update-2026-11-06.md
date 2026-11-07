# 既存記事更新案：ドイツの放送負担金ガイド

- 対象ページ：https://j-connect-global.com/germany/ja/living/rundfunkbeitrag-guide/
- 対象ファイル：`content/living/rundfunkbeitrag-guide.md`
- 現行版の最終更新：2026-10-31
- 提案更新日・再確認日：2026-11-07
- 目的：2026年11月8日開始の全国住民データ照合と、2026年12月中旬からの通知に備えた実務案内を追加する。
- 重複回避：既存の「住戸単位の負担金」説明は残し、新しいニュース記事 `rundfunkbeitrag-meldedatenabgleich-2026` に日程・通知・回答手順を集約する。

## 推奨メタデータ差分

- `updated_at`: `2026-11-07`
- `last_verified`: `2026-11-07`
- `next_review`: `2026-12-15`
- `summary`: 「ドイツの放送負担金について、住戸単位の負担、同居・引っ越し・免除の手続きに加え、2026年11月8日開始の全国住民データ照合と通知への対応を説明します。」
- `related_articles` に `rundfunkbeitrag-meldedatenabgleich-2026` を追加。
- `official_sources` に次の3件を追加：
  - 2026年11月5日付の照合開始発表：https://www.rundfunkbeitrag.de/presse-und-aktuelles/presse/beitragsservice-startet-bundesweiten-meldedatenabgleich-2026
  - 2026年照合の質問と回答：https://www.rundfunkbeitrag.de/buergerinnen-und-buerger/informationen/informationen-zum-meldedatenabgleich/fragen-und-antworten-zum-bundesweiten-meldedatenabgleich
  - 照合の手紙が届いた場合の案内（2026年11月5日）：https://www.rundfunkbeitrag.de/presse-und-aktuelles/servicethemen/ploetzlich-post-vom-beitragsservice-meldedatenabgleich-2026-das-muessen-sie-tun
  - 州間協定第11条：https://www.gesetze-bayern.de/Content/Document/RBeitrStV-11

## 挿入位置

既存の `## 手紙が届く理由と読む順番` の後、`## 放置すると何が起きるか` の前に、次の節を追加する。

## 2026年11月の全国住民データ照合

2026年11月8日を基準日として、自治体の住民登録情報と放送負担金事務局の登録情報を全国規模で照合します。対象はドイツに住民登録している18歳以上の人で、約7,300万件のデータが11月9日から12月8日まで段階的に送信される予定です。通知開始時期は、11月5日付のプレス発表と公式FAQが「12月14日ごろ」とする一方、同日付のサービス解説記事は「2027年1月から」としており、公式ページ間で差があります（2026年11月7日確認）。本文では発送日を断定せず、個別通知の回答期限を優先するよう案内します。

同じ住戸で家族や同居人がすでに支払っている場合、その人の支払者番号を回答します。オンラインフォームでは通知書の10桁の照会番号（Aktenzeichen）も必要です。郵送の返信用紙には照会番号があらかじめ印字されているため、支払者番号を記入します。手紙が届いたことだけで、同じ住戸に二件目の負担金が発生するわけではありません。通知書に記載された期限と送信完了の記録を保存します。

誰もその住戸の負担金を支払っていない場合は、入居日を基準に登録・請求される可能性があります。2026年の全国照合を通じた遡及登録は、公式FAQによると2024年1月1日より前にはさかのぼりません。免除・減額の要件を満たす場合は、証明書を添えて申請します。なお、照合開始日だけを理由に全員が先に申請する必要はなく、確認の手紙が届いた場合はその案内に従います。

照合は法律に基づく手続きであり、自治体からのデータ送信自体には異議を申し立てられません。未確認データは法律上、最長12か月で削除されます。すでに登録済みの住戸に結び付いた人のデータは、照合後に速やかに削除されると事務局は説明しています。

詳しい日程、手紙が届いた場合の回答方法、過去に回答済みでも再通知される可能性については、[2026年の全国住民データ照合ガイド](/germany/ja/events/news/rundfunkbeitrag-meldedatenabgleich-2026/)を参照してください。支払い状況は[公式の残高確認サービス](https://www.rundfunkbeitrag.de/kontostand)でも確認できます。

## FAQへの追加案

### 2026年の照合で日本人も対象になりますか？

ドイツに住民登録している18歳以上の人が対象です。公式FAQは国籍で対象を限定していないため、日本国籍の成人も対象に含まれます。

### 同居人がすでに支払っているのに手紙が届いたら？

同じ住戸の支払い担当者の支払者番号を確認し、公式フォームまたは返信用紙で回答します。手紙を無視せず、回答期限を守ってください。

### 過去の照合で回答済みでも、再び手紙が届くことはありますか？

あります。過去の照合後に一部の登録データが削除されている場合など、再び確認される可能性があると公式FAQは説明しています。今回の手紙にも回答してください。

## 追加する実務上の注意

- 法律上の対象項目には、姓・名、以前の氏名、博士号、婚姻状況、生年月日、現在および直前の主住所・副住所（住戸の位置情報を含む）、住戸への入居日が含まれる。公式FAQ・発表は一部を要約しているため、詳細は州間協定第11条第5項を一次根拠とする。
- 個別の回答期限は一律の日付として書かず、届いた通知書に記載された期限を優先する。
- 同じ住戸の支払者番号は、桁数を記事側で固定せず、通知書・公式フォームの表示に従って入力する。
- 送信期間や発送開始日は予定として表現し、実際の発送開始後に公式案内を再確認する。

## 公開前チェック

1. 2026年11月8日以降、公式FAQの送信期間・通知開始日が変わっていないか再確認する。
2. 2026年12月14日以降、実際の発送状況に関する公式案内が追加されていないか確認する。
3. 既存記事の月額負担金や支払い方法の説明は、今回の照合開始と混同させない。
4. 新しいニュース記事への内部リンクは、記事が公開された後に有効化する。

## 2026年11月7日の追加確認：通知開始日の公式表記差

- 2026年11月5日付プレス発表（https://www.rundfunkbeitrag.de/presse-und-aktuelles/presse/beitragsservice-startet-bundesweiten-meldedatenabgleich-2026）と公式FAQ（https://www.rundfunkbeitrag.de/buergerinnen-und-buerger/informationen/informationen-zum-meldedatenabgleich/fragen-und-antworten-zum-bundesweiten-meldedatenabgleich）は、最初の確認書面を2026年12月14日ごろから送ると説明している。
- 同じく2026年11月5日付のサービス記事（https://www.rundfunkbeitrag.de/presse-und-aktuelles/servicethemen/ploetzlich-post-vom-beitragsservice-meldedatenabgleich-2026-das-muessen-sie-tun）は、最初の書面を2027年1月から送るとしている。
- 2026年11月7日時点で、これらの公式ページを調整する訂正告知は確認できていない。記事では「12月14日ごろ」と断定せず、両方の表記を明記し、受領した個別通知の回答期限を優先する。
- 公式FAQによると、オンラインフォームには通知書の10桁の照会番号と必要な支払者番号を入力する。郵送の返信用紙には照会番号が印字されているため、同居人の支払者番号を記入すればよい。
- 公式サービス記事によると、最初の通知に回答しない場合は再通知があり、それでも回答がないと自動登録される。本文の説明もこの順序に合わせる。
