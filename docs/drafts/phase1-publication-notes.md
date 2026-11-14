# フェーズ1 公開時の手順（2026-11-14 作成）

下書きの2本（L110・L111）は `published: false`。公開を決めたら次を一緒に行う。

1. `content/living/birth-registration-foreign-spouse-germany.md` と `certified-translation-germany.md` の `status: "published"`、`published: true`、`published_at` を設定し、registry の `hub_visible`・`search_visible`・`sitemap_visible` を true にする。
2. L046（birth-procedures-germany）から L110 へリンクする。下書きの間は本番でリンク切れになるため外してある。
   - 「あなたはどのケース？」表の「配偶者が外国籍」行の「先に読むところ」
   - 「編集部の実例」表の直後の段落
3. `npm run build` と `npm run validate` を通す。
4. 公開後4週間で Search Console の変化を見る（計画書 第8章 フェーズ1 最終項目）。

## 公開前に確認したいこと（原典を開けなかったもの）

- 在デュッセルドルフ日本国総領事館の出生届・国籍留保の案内（www.dus.emb-japan.go.jp）
- NRW州司法の通訳・翻訳者のページと、州司法当局の翻訳者データベース（www.justiz.nrw、www.justiz-dolmetscher.de）
- NRW州保育法（KiBiz）2026年8月施行版の第1条・第5条（recht.nrw.de）
