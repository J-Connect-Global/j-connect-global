# 記事カバー画像更新 — 2026-11-22 実行記録（更新版）

## 現在のGitHub反映状況

- Draft PR: https://github.com/J-Connect-Global/j-connect-global/pull/518
- 直近1か月（2026-10-22〜11-22）の公開記事: **114件**。元のaltテキストでイラスト／図解と説明されていた記事: **103件**（画像内容の実測ではなくメタデータ判定）。
- **9記事（対象期間内）を更新し、追加で前日2026-10-21公開の1記事も更新**。合計**10記事、40画像ファイル**（1200×675 WebP、768w WebP、480w WebP、1200×630 OG JPEG）。
- 内訳: **Wikimedia Commons実写真3記事**、**AI生成の写真調イメージ7記事**。実写真は過去の撮影年を表示。AI画像には編集イメージである旨と、実在の写真・資料ではない旨を明記。
- 本文中の必要な図表、タイムライン、手順図は削除せず保持。記事・registry・OG・サムネイルを同期。
- 残り: **94記事**が旧イラスト表記のまま優先レビュー対象、**11記事**は既存画像の目視確認対象。元の2件の image/image_url 不一致は今回の範囲で解消。
- **main / 本番へのマージや公開はしていない**。本PRは引き続きドラフト。

## 変更した10記事

| タイプ | 記事のslug |
|---|---|
| 実写真（Wikimedia Commons・撮影年明記） | cologne-christmas-markets-2026-guide |
| 実写真（Wikimedia Commons・撮影年明記） | berlin-christmas-markets-2026-guide |
| 実写真（Wikimedia Commons・撮影年明記） | nrw-christmas-market-day-trips-2026 |
| AI生成 | christmas-post-germany-to-japan-2026 |
| AI生成 | cologne-carnival-2026-27-guide |
| AI生成 | christmas-new-year-greetings |
| AI生成 | germany-january-2027-changes |
| AI生成 | rundfunkbeitrag-meldedatenabgleich-2026 |
| AI生成 | euro-7-germany-2026 |
| AI生成 | nrw-christmas-opening-hours-2026 |

## テストと出典

- Commons実写真3件: GitHub Actions [45072423397](https://github.com/J-Connect-Global/j-connect-global/actions/runs/45072423397) — **success**。出典・ライセンスは `content/article-photo-credits.json` に保存。
- AI生成6件: GitHub Actions [45072897859](https://github.com/J-Connect-Global/j-connect-global/actions/runs/45072897859) / [45073042789](https://github.com/J-Connect-Global/j-connect-global/actions/runs/45073042789) — **success**。
- AI生成1件追加: GitHub Actions [45073486253](https://github.com/J-Connect-Global/j-connect-global/actions/runs/45073486253) — **success**。
- 各画像追加の直後に生成HTML未同期状態を検出した一時的なCI失敗がある。上記の自動処理は各バッチで `npm run build` と `npm run validate` の成功後にコミットしている。最終PRヘッドの通常CI検証も確認すること。
- `docs/article-cover-photo-audit-2026-11-22.json` が全114記事の優先度・進捗台帳の正本。

## 残りの進め方

1. 残り94記事から季節性と流入規模を考慮して優先順位を決め、記事の主題に合う画像を個別に作成・選定する。
2. 実写真は作者・オリジナルURL・ライセンス・改変履歴を登録し、撮影年を示す。実在の2026年の行事写真と誤認させない。
3. AI生成画像は一枚ずつ内容と自然さを確認し、再利用・重複を避ける。横長WebPとOG JPEG、縮小版を揃える。
4. 記事frontmatterとregistryを同期し、本文図解は維持。ビルドとvalidatorで検証する。
5. PRに蓄積し、mainへのマージと本番公開は明示承認と最終QAの後に行う。

---
# 過去の作業メモ（更新前の記録）

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
