# 2026-11-22 記事カバー画像の更新引き継ぎ

## 現状と対象

- 2026-10-22〜2026-11-22 に公開した記事: **114件**（living 52 / events 61 / learn-german 1）。
- altに「イラスト」「図解」等が含まれる記事: **103件**。これは目視で写真品質を検査した件数ではなく、メタデータ上の機械判定。
- 前の画像生成セッションの**9枚をライブラリから回収し、1200×675 WebPに最適化済み**。本チャットの `jconnect-article-images-9-ready-20261122.zip` にまとめた。GitHubに画像バイナリをアップロードする工程は**未実施**。
- 9枚のうち**8枚**が上記1か月の集計期間内、残る1枚（`germany-january-2027-changes`）は2026-10-21公開。
- 対象期間内の「イラスト」等の説明を持つ**残り95件は画像差し替え未準備**。写真風画像の生成やライセンス確認が必要。
- `image` と `image_url` の値が不一致のレジストリ項目が2件ある。公開前にOG/カード/本文が同一カバーを指すかを検証。

## 回収できた9枚（WebP）

| 記事スラッグ | 画像保存先 |
|---|---|
| christmas-post-germany-to-japan-2026 | `assets/img/living/christmas-post-germany-to-japan-2026.webp` |
| cologne-carnival-2026-27-guide | `assets/img/events/cologne-carnival-2026-27-guide.webp` |
| christmas-new-year-greetings | `assets/img/learn-german/christmas-new-year-greetings.webp` |
| germany-january-2027-changes | `assets/img/events/germany-january-2027-changes.webp` |
| rundfunkbeitrag-meldedatenabgleich-2026 | `assets/img/events/rundfunkbeitrag-meldedatenabgleich-2026.webp` |
| euro-7-germany-2026 | `assets/img/events/euro-7-germany-2026.webp` |
| cologne-christmas-markets-2026-guide | `assets/img/events/cologne-christmas-markets-2026-guide.webp` |
| nrw-christmas-market-day-trips-2026 | `assets/img/events/nrw-christmas-market-day-trips-2026.webp` |
| berlin-christmas-markets-2026-guide | `assets/img/events/berlin-christmas-markets-2026-guide.webp` |

## 完了までの残工程

1. ZIPの9 WebPを正しい場所にアップロードし、同梱の `apply_image_metadata.py` を実行。frontmatter、registry、既存の `image_url` を更新。**既存の本文図解・良質な写真は維持**。
2. `npm run build`、`npm run validate`、必要に応じて `npm run validate:all`。
3. 375px・1280px、OGメタデータ、サムネイル、hero、本文写真、alt・AI開示文を目視と自動検証。特定の実在イベントを撮影したような誤認を避ける。
4. 追加の95件について、`docs/article-cover-photo-audit-2026-11-22.json` の優先度で画像を選定し、同じ手順で編集する。実写が必要な記事には権利を確認したWikimedia Commons等の実写真を使い、利用条件・作者・原画像URLを `content/article-photo-credits.json` に記録。
5. 承認済み内容をドラフトPRでレビューし、本番公開は明示承認とCI完了後にのみ実行。

## 制約・注意

- このブランチでは**画像の公開反映は一切行っていない**。ZIP内の画像はGitHub未反映。リポジトリの `main` は未変更。
- 元の会話は一時的な読み込み制限によって開けないが、9枚はライブラリ上の生成画像から復旧した。
- `docs/article-images.md`、`AGENTS.md` に従う。追加課金なし。画像のAI生成は事実資料・肖像写真の代用として使わない。
