# J-Connect Global｜本文画像改善 Wave 1（2026-11-23）

## 対象
2026-10-22〜2026-11-22の公開記事114本（Events 61／Living 52／Learn German 1）。前回監査の参考値は本文画像229点（SVG 223、WebP 6）。今回の作業では全画像をまだ目視確認していない。

## 今回更新した本文図解（4点）
| 記事 | ファイル | 主な改善 |
| --- | --- | --- |
| グリューワイン | gluehwein-eu-definition.svg | EU規則の4条件を整理し、ワインの種類・例外に言及 |
| 同上 | gluehwein-label-sugar-kids.svg | 材料表示、糖分の調査例、子ども向け0.0%飲料を区分 |
| クリスマスツリーの歴史 | christmas-tree-history-timeline.svg | 5つの時代を再構成し、歴史上の不確実性を保持 |
| デュッセルドルフのカーニバル | duesseldorf-carnival-hoppeditz-year.svg | 目覚め・風刺・街頭祭典・灰の水曜日の循環を再設計 |

注：アドベントの記事2点（advent-wreath-then-now.svg、advent-calendar-history.svg）は並行作業によりmain上で既に改善済み。今回のPRではその新しい版を優先し、上書きしない。

すべてJ-Connect Globalが制作した編集図解。ドキュメンタリー写真・実際の2026年イベントの撮影記録ではない。Markdown、既存URL、出典リンクを変更せず、参照先SVGを更新。

## 全本文画像監査の継続
追加した scripts/audit-inline-images.mjs は公開記事のMarkdownを走査し、カバーを除く本文画像の順番（2枚目以降）、パス、alt、ファイル形式、欠落、SHA-256による重複、SVGのtitle/descを報告する。

実行：node scripts/audit-inline-images.mjs --out docs/audits/inline-image-inventory-2026-11-23.json

自動レポートは視覚的品質を判定しない。全画像に目視審査が必要。重複は、同じ内容を説明する場合は許容可能であり、無条件に削除しない。

## 残課題と優先順位
1. P1：季節・イベント記事の残り本文画像を目視審査。情報価値のある図解は残し、粗いイラスト・使い回しを改善。
2. P1：検索流入が多い記事、画像と主題が一致しない記事、複数記事に共有される画像を優先。
3. P2：医療・行政・育児の図解は原典確認を伴う編集レビュー。日付・法的条件・解釈を維持。
4. P2：WebPの写真・AI画像は作者、元画像、ライセンス、AI開示、撮影日、alt/キャプションを照合。
5. QA：SVG構文、モバイルの読みやすさ、npm run build、npm run validate、ブラウザ表示、CI。公開は検証後。

関連のないドラフトPR #495 / #505は変更対象外。追加課金を伴う処理は行わない。
