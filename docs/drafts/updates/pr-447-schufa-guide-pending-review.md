# PR #447 未公開の差分記録：schufa-guide

2026-11-21に旧PRの提案を保存。公開原稿ではなく、現行mainへ適用していない参考差分です。日付・法令・個別条件は改めて一次情報で確認し、必要な専門レビューを経てから採用してください。期限終了トピックは現行の案内として再公開しません。

```diff
diff --git a/content/living/schufa-guide.md b/content/living/schufa-guide.md
index 224a205..9756bb1 100644
--- a/content/living/schufa-guide.md
+++ b/content/living/schufa-guide.md
@@ -1,16 +1,16 @@
 ---
 id: "L005"
-title: "SCHUFAの取り方｜賃貸に出す証明と無料データの違い・履歴がないとき"
+title: "SCHUFAの取得方法｜賃貸用証明・無料データ・新スコア"
 slug: "schufa-guide"
 category: "住まい"
 tags: ["信用情報", "SCHUFA", "賃貸", "個人情報", "家探し"]
-summary: "SCHUFAの書類は目的で選びます。家主に出す有料の信用証明、無料のデータコピー、無料アカウントの違いと取り方、ドイツに来たばかりで履歴がないときの代わりの資料を日本語で整理します。"
+summary: "SCHUFAの取得方法と書類の選び方を日本語で解説。賃貸提出用の信用証明、無料データコピー、無料アカウント、2026年の新スコア、履歴がない場合の代替資料を整理します。"
 status: "published"
 published: true
 published_at: "2026-03-10"
-updated_at: "2026-10-17"
-last_verified: "2026-10-17"
-next_review: "2027-01-17"
+updated_at: "2026-11-13"
+last_verified: "2026-11-13"
+next_review: "2026-11-20"
 canonical_url: "/germany/ja/living/schufa-guide/"
 image_alt: "ドイツの賃貸応募に使う信用証明と自己確認用データの違いを示す図"
 related_articles: ["rent-apartment-germany", "bank-account-germany", "germany-first-30-days", "liability-household-insurance-germany"]
@@ -23,9 +23,13 @@ official_sources:
     url: "https://www.schufa.de/scoring-daten/schufa-score-kostenlos/"
   - title: "データ保護監督当局：賃貸応募者の情報取得（2026年版）"
     url: "https://datenschutz.hessen.de/sites/datenschutz.hessen.de/files/2026-06/oh_einholung_von_selbstauskuenften_mietinteressenten_01_2026.pdf"
+  - title: "連邦官報：EU消費者信用指令の国内法化法（2026年5月18日公布、BGBl. 2026 I Nr. 139）"
+    url: "https://recht.bund.de/bgbl/1/2026/139/VO.html"
+  - title: "連邦政府：信用契約における消費者保護の強化（2026年5月19日）"
+    url: "https://www.bundesregierung.de/breg-de/schwerpunkte/wirksam-regieren/schutz-kreditvertraege-2382528"
 ---

-# SCHUFAの取り方｜賃貸に出す証明と無料データの違い・履歴がないとき
+# SCHUFAの取得方法｜賃貸用証明・無料データ・新スコア

 ドイツで部屋を借りたり、後払い・クレジットを申し込んだりすると、信用情報の確認を求められることがあります。この記事は、ドイツへ来たばかりの人が、どの書類を誰へ渡すのかを混同せず、必要以上の個人情報を開示しないための案内です。読み終えると、賃貸提出用の証明と、自分の登録内容を確認する無料データの違いが分かります。

@@ -134,6 +138,15 @@ SCHUFAは、ドイツの信用情報機関です。銀行、通信会社、小

 点数を上げる目的だけで口座やカードを増やしたり、「何日で何点上がる」と断定するサービスへ申し込んだりするのは避けてください。借入れの審査と賃貸応募は異なり、自分の生活に必要な契約かどうかを先に判断します。

+
+## 2026年11月20日からの信用スコアと自動審査のルール
+
+2026年11月20日から、消費者信用に関する改正法のうち、スコアリングや信用力審査に関する規定も適用されます。契約判断に使うスコアを作成・利用する際には、特別な種類の個人データ、年齢・性別・氏名、SNSの利用データ、銀行口座の入出金データ、住所データなどを利用できないと定められました。支払い遅延の情報も、法律が定める条件に該当するものに限られます。
+
+一般消費者ローンの信用力審査に自動処理が含まれる場合、借り手は人による介入、審査の仕組みやリスクの説明、自分の見解を述べる機会、審査と融資判断の見直しを求められます。SCHUFAのスコアと、銀行や決済事業者が行う個別の審査は同じものではありません。スコアは判断材料の一つであり、契約を結ぶかどうかの最終判断は契約先が行います。
+
+この改正は、スコアの自動上昇や過去の登録情報の一括削除を意味しません。自分の情報に誤りがないかを確認し、誤りがあれば情報の登録元とSCHUFAに訂正を求めます。新しい規定の適用後に運用案内が更新される可能性があるため、11月20日以降も公式情報を確認してください。
+
 ## よくある疑問

 ### 無料アカウントがあれば有料証明は不要ですか
```
