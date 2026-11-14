# 未レビュー記事（needs_review）の一次情報確認の基準（2026-11-14）

計画書 第8章フェーズ2「未レビュー27本の一次情報確認【Fableで基準作成→Sonnetで照合】」の基準です。照合作業はこの基準に沿って1本ずつ行い、終わったら registry の `review.status` を `reviewed` に、`review.reviewed_by` に照合した内容を書きます。

## 1. 何を確認するか

1本ごとに、次の数字と条件を**すべて**拾い出し、一次情報と照らし合わせる。

- 期限（日数・日付）、金額（手当・料金・上限・保険料率）、年齢・年数・時間の条件
- 必要書類と提出先（窓口の種類）
- 法令の条文番号と、その条文が本当にその内容か
- 「2026年」「2027年から」など、時期が書かれている制度変更（施行済みか、法案段階か）

## 2. 一次情報として認めるもの

| 種類 | 例 | 扱い |
| --- | --- | --- |
| 法令 | gesetze-im-internet.de（連邦）、recht.nrw.de（NRW州） | 最優先。条文を開いて確認 |
| 公的機関 | 連邦・州・市の公式ページ、連邦雇用庁、保険組合の連合会、G-BA、KBV | 法令の運用・金額・様式の確認に使う |
| 日本の公的機関 | 在外公館、外務省、厚生労働省、日本年金機構、e-Gov | 日本側の手続き |
| 二次情報 | 新聞、比較サイト、保険会社、ブログ、検索結果の要約 | 一次情報の代わりにしない。手がかりとしてのみ使い、記事には「未確認」と書く |

## 3. 判定と記事への反映

| 判定 | 条件 | 記事でやること |
| --- | --- | --- |
| 確認済み | 一次情報を開いて内容が一致 | 出典に「（YYYY年M月D日確認）」を付ける |
| 修正 | 一次情報と食い違う | 本文を直し、`updated_at` を更新。期限・金額の修正は記事内に訂正日と内容を書く（編集方針の下書きどおり） |
| 未確認 | 一次情報を開けない・見つからない | 本文はそのままにせず、該当箇所に「未確認」と書くか、断定をやめる。一覧に残す |
| 古い | 年度が変わった・施行日を過ぎた | 最新の数字に更新し、`next_review` を次の改定時期（1月・7月）に合わせる |

- 財務・健康・法律（下の表のA）は、数字が一つでも未確認なら `reviewed` にしない。
- 記事標準2026-11へ書き換える場合は、`docs/article-standard-2026-11.md` に従う。

## 4. この環境から開けない主な公的サイト（2026-11-14時点）

連邦雇用庁（arbeitsagentur.de）、在外公館（emb-japan.go.jp）、外務省・厚労省・e-Gov、連邦財務省、ELSTER、連邦家族ポータル（familienportal.de）、RKI、NRW州の法令・省庁（recht.nrw.de、*.nrw）、BaFin、連邦政府・連邦議会。これらが出典の記事は、ネットワーク許可を追加するか、手元のブラウザで確認する必要がある。

開けるもの：gesetze-im-internet.de、duesseldorf.de、連邦保健省、G-BA、KBV、GKV連合会、TK、AOK、消費者センター、DHL、税関（zoll.de）、日本郵便。

## 5. 照合の順番（A＝財務・健康・法律・行政、B＝契約・暮らし）

| 区分 | ID | 記事 | 前回確認 | 出典のドメイン |
| --- | --- | --- | --- | --- |
| A | L045 | [ドイツの出産当日ガイド｜陣痛・破水から赤ちゃん誕生まで…](/germany/ja/living/birth-day-germany/) | 2026-10-11 | gesund.bund.de, www.familienplanung.de, www.familienportal.nrw, www.nhs.uk |
| A | L051 | [Kindergeld（ドイツの児童手当）2027年の支給日一覧｜番号…](/germany/ja/living/kindergeld-auszahlungstermine-2027/) | 2026-10-27 | familienportal.de, www.arbeitsagentur.de, www.bundesfinanzministerium.de, www.bundesregierung.de, www.bundestag.de |
| A | L052 | [ドイツの電子患者記録（ePA）入門｜閲覧権限・非表示・アプリ管理…](/germany/ja/living/epa-guide-germany/) | 2026-10-27 | gesund.bund.de, www.bundesgesundheitsministerium.de |
| A | L053 | [NRWの学校休暇2026/27年度｜2027年の春・夏・年末年始…](/germany/ja/living/nrw-school-holidays-2026-2027/) | 2026-10-27 | bass.schule.nrw, www.kmk.org, www.land.nrw |
| A | L054 | [NRWの祝日2027年一覧｜連休・ブリッジデー・学校休暇との違い…](/germany/ja/living/nrw-public-holidays-2027/) | 2026-10-27 | recht.nrw.de, www.kmk.org, www.land.nrw |
| A | L056 | [ドイツのMinijob（ミニジョブ）2027｜月633ユーロの上限・…](/germany/ja/living/minijob-grenze-2027/) | 2026-11-05 | magazin.minijob-zentrale.de, www.bmas.de, www.gesetze-im-internet.de, www.minijob-zentrale.de |
| A | L057 | [NRWのクリスマス2026｜スーパー・薬局・公共交通の営業日チェック…](/germany/ja/living/nrw-christmas-opening-hours-2026/) | 2026-10-28 | int.bahn.de, recht.nrw.de, www.aponet.de, www.rheinbahn.de |
| A | L060 | [ドイツから本帰国するときの手続き｜3か月前から帰国後まで、やることを…](/germany/ja/living/returning-to-japan-checklist/) | 2026-10-29 | rvrecht.deutsche-rentenversicherung.de, service.duesseldorf.de, www.ezairyu.mofa.go.jp, www.gesetze-im-internet.de, www.mhlw.go.jp, www.nenkin.go.jp, www.rundfunkbeitrag.de |
| A | L063 | [ドイツの失業手当（Arbeitslosengeld）｜もらえる条件・…](/germany/ja/living/unemployment-benefit-germany/) | 2026-10-29 | www.arbeitsagentur.de, www.bmas.de, www.gesetze-im-internet.de |
| A | L064 | [ドイツで子どもの学校をどう選ぶ？｜現地校のしくみ、日本人学校・補習授…](/germany/ja/living/schools-germany-japanese-families/) | 2026-10-29 | schulministerium.nrw, www.dus.emb-japan.go.jp, www.joes.or.jp, www.schulministerium.nrw |
| A | L065 | [日本の運転免許とドイツ｜ドイツの免許への切り替え（試験なし）と、海外…](/germany/ja/living/drivers-license-japan-germany/) | 2026-10-29 | service.duesseldorf.de, www.dus.emb-japan.go.jp, www.gesetze-im-internet.de, www.keishicho.metro.tokyo.lg.jp, www.mofa.go.jp, www.muenchen.de.emb-japan.go.jp, www.npa.go.jp, www.stadt-koeln.de |
| A | L066 | [日独社会保障協定と年金｜駐在の「適用証明書」、加入期間の通算、帰国す…](/germany/ja/living/japan-germany-social-security-pension/) | 2026-10-29 | rvrecht.deutsche-rentenversicherung.de, www.deutsche-rentenversicherung.de, www.dus.emb-japan.go.jp, www.mhlw.go.jp, www.nenkin.go.jp |
| A | L067 | [ドイツで日本語で受診できる医療機関の探し方｜在外公館の案内、医師検索…](/germany/ja/living/japanese-speaking-doctors-germany/) | 2026-10-29 | arztsuche.116117.de, gesund.bund.de, www.116117.de, www.dus.emb-japan.go.jp, www.mofa.go.jp |
| A | L068 | [ドイツの歯医者のかかり方｜保険で受けられる健診、クリーニングの費用、…](/germany/ja/living/dentist-germany-guide/) | 2026-10-29 | gesund.bund.de, www.bundesgesundheitsministerium.de, www.verbraucherzentrale.de |
| A | L069 | [ドイツで車を買う・登録する・TÜV｜保険の番号、登録に必要な書類、車…](/germany/ja/living/buying-registering-car-germany/) | 2026-11-07 | eur-lex.europa.eu, service.duesseldorf.de, www.adac.de, www.kba.de, www.stadt-koeln.de, www.umweltbundesamt.de |
| A | L070 | [ドイツから日本の選挙に投票する（在外選挙）｜在外選挙人名簿の登録と、…](/germany/ja/living/overseas-voting-japan/) | 2026-10-29 | www.dus.emb-japan.go.jp, www.mofa.go.jp, www.soumu.go.jp |
| A | L071 | [家族をドイツに呼び寄せるとき｜配偶者・子どもの滞在許可、ドイツ語の条…](/germany/ja/living/family-reunification-spouse-work-germany/) | 2026-10-29 | www.bamf.de, www.gesetze-im-internet.de, www.make-it-in-germany.com |
| A | L072 | [ドイツのEUブルーカードとは｜2026年の年収の条件、ほかの滞在許可…](/germany/ja/living/eu-blue-card-germany/) | 2026-10-29 | www.bamf.de, www.bundesanzeiger.de, www.gesetze-im-internet.de, www.make-it-in-germany.com |
| A | L074 | [ドイツの確定申告（Steuererklärung）入門｜会社員の義務…](/germany/ja/living/income-tax-return-germany/) | 2026-11-05 | www.elster.de, www.gesetze-im-internet.de, www.verbraucherzentrale.de |
| A | L075 | [ドイツの永住許可（Niederlassungserlaubnis）｜…](/germany/ja/living/permanent-residence-germany/) | 2026-11-05 | laws.e-gov.go.jp, www.duesseldorf.de, www.gesetze-im-internet.de, www.make-it-in-germany.com |
| A | L076 | [ドイツの育児給付（Elterngeld）の計算と受け取り方｜手取りの…](/germany/ja/living/elterngeld-guide-germany/) | 2026-11-06 | familienportal.de, www.familienportal.nrw, www.gesetze-im-internet.de |
| A | L077 | [ドイツ国籍の取得（Einbürgerung）と日本国籍｜5年の条件、…](/germany/ja/living/einbuergerung-germany-japanese/) | 2026-11-06 | laws.e-gov.go.jp, www.dus.emb-japan.go.jp, www.gesetze-im-internet.de, www.make-it-in-germany.com |
| B | L049 | [ドイツの冬タイヤ義務2026｜交換時期・雪マーク・オールシーズンタイ…](/germany/ja/living/winter-tires-germany-2026/) | 2026-11-02 | www.adac.de, www.gesetze-im-internet.de |
| B | L050 | [ドイツの2025年共益費精算｜2026年末の期限・追加請求・異議申立…](/germany/ja/living/nebenkostenabrechnung-2025-deadline/) | 2026-10-20 | www.gesetze-im-internet.de, www.verbraucherzentrale.de |
| B | L061 | [ドイツの個人賠償責任保険と家財保険｜入るべき理由・補償額の目安・選び…](/germany/ja/living/liability-household-insurance-germany/) | 2026-10-29 | www.gesetze-im-internet.de, www.test.de, www.verbraucherzentrale.de |
| B | L062 | [ドイツの携帯電話・SIMの選び方｜プリペイドと契約プラン、本人確認、…](/germany/ja/living/mobile-phone-sim-germany/) | 2026-10-29 | www.bundesnetzagentur.de, www.gesetze-im-internet.de, www.verbraucherzentrale.de |
| B | L073 | [ドイツから日本へクリスマス・年末の荷物と手紙を送る2026｜締切・料…](/germany/ja/living/christmas-post-germany-to-japan-2026/) | 2026-11-01 | www.deutschepost.de, www.dhl.de, www.zoll.de |
