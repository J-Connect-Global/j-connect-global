# 記事画像点検・修正（2026-10-20）

公開中の121記事（Living 47、ニュース・イベント・コラム45、ドイツ語学習29）の主画像と本文画像を点検。18記事の画像構成を修正し、別途11記事の既存写真を構図・内容を維持して軽量化しました。

- 主画像13点を、縮小表示で主題が伝わる写真・イラストへ差替。文字中心8点、ロゴのみ2点、別記事と共用していた3点を解消。
- 同一ファイルの主画像・本文重複9件と、同じ説明図のSVG/WebP重複2件を解消。本文の役割に応じて削除・別場面・説明図へ変更。
- AI画像の開示と代替テキストを画像に合わせて更新。資料写真の作者・原画像・ライセンスの表示を維持。
- 事実確認日（last_verified）を進めず、画像変更日だけを更新。
- 主画像の存在・仮画像・同一ファイルの重複を継続チェック。別形式の重複と画像の適切さは目視確認する選定基準を追加。

## 修正した記事

| ID | 記事 | 主画像 | 本文画像 |
| --- | --- | --- | --- |
| L045 | [ドイツの出産当日ガイド｜陣痛・破水から赤ちゃん誕生まで](https://j-connect-global.com/germany/ja/living/birth-day-germany/) | 差替 | 維持 |
| L042 | [ドイツのゴミ分別｜デュッセルドルフの捨て方・収集日・よくある間違い](https://j-connect-global.com/germany/ja/living/germany-waste-sorting-guide/) | 差替 | 維持 |
| L043 | [ドイツのPfand返却方法｜25セント・返金券・機械で返せないとき](https://j-connect-global.com/germany/ja/living/germany-pfand-return-guide/) | 差替 | 維持 |
| L009 | [ドイツのKita・U3申込み｜NRWの保育先・必要書類](https://j-connect-global.com/germany/ja/living/kita-u3-tagesmutter-guide/) | 維持 | 重複解消 |
| L001 | [ドイツの住民登録ガイド｜期限、入居証明、予約、登録後の流れ](https://j-connect-global.com/germany/ja/living/anmeldung-guide/) | 維持 | 重複解消 |
| L003 | [ドイツの健康保険｜公的保険と民間保険をどう選ぶか](https://j-connect-global.com/germany/ja/living/health-insurance-guide/) | 維持 | 重複解消 |
| L031 | [ドイツでワールドカップ2026を振り返る｜放送、観戦文化、日本代表](https://j-connect-global.com/germany/ja/living/world-cup-2026-watch-germany/) | 維持 | 重複解消 |
| L039 | [ドイツの電車の乗り方｜列車の違い・切符・乗り換え・遅延](https://j-connect-global.com/germany/ja/living/germany-train-travel-guide/) | 差替 | 維持 |
| L047 | [ドイツのDHL Packstationの使い方｜登録・宛先・受取コード・保管期限](https://j-connect-global.com/germany/ja/living/dhl-packstation-guide/) | 差替 | 維持 |
| L048 | [ドイツのDHLが配達済みなのに届かない｜確認場所・問い合わせ・複数個口](https://j-connect-global.com/germany/ja/living/dhl-delivered-but-not-received/) | 差替 | 維持 |
| N021 | [Deutschlandticketは2027年66.80ユーロへ｜DB利用者は11月30日までに確認](https://j-connect-global.com/germany/ja/events/news/deutschlandticket-2027-price-consent/) | 維持 | 重複解消 |
| N022 | [DBの2027年ダイヤが予約開始｜家族券99.99ユーロとNRW―ベルリン工事の注意点](https://j-connect-global.com/germany/ja/events/news/db-2027-timetable-family-ticket/) | 差替 | 維持 |
| C005 | [ドイツの冬時間は10月25日から｜「1時間戻る」日に暮らしはどう変わる？](https://j-connect-global.com/germany/ja/events/columns/germany-winter-time-2026/) | 差替 | 重複解消 |
| G001 | [予約のドイツ語フレーズ｜電話・メールで予約・変更・キャンセルする](https://j-connect-global.com/germany/ja/learn-german/appointment-phrase/) | 差替 | 維持 |
| G009 | [買い物のドイツ語｜スーパー・返品・配送問い合わせのフレーズ](https://j-connect-global.com/germany/ja/learn-german/shopping-phrases/) | 差替 | 維持 |
| G026 | [観光・週末旅行で使えるドイツ語｜駅・ホテル・観光案内所のフレーズ](https://j-connect-global.com/germany/ja/learn-german/travel-german-phrases/) | 差替 | 維持 |

| L049 | [ドイツの冬タイヤ義務2026](https://j-connect-global.com/germany/ja/living/winter-tires-germany-2026/) | 差替 | 重複解消 |
| L050 | [ドイツの2025年共益費精算](https://j-connect-global.com/germany/ja/living/nebenkostenabrechnung-2025-deadline/) | 差替 | 重複解消 |

## 検証

- 全121記事の画像存在・同一画像重複チェック。
- 写真出典チェック：121記事、48掲載箇所、43写真。
- 240px程度の一覧画像、スマートフォン360px、デスクトップで構図と読み込みを確認。
- 全体検証とブラウザテスト135件が合格。重複画像・仮画像の拒否も確認。
- 画像総容量38,000,000バイトの上限を維持。

## 記録

- `article-image-audit-2026-10-20.csv`：121記事それぞれの維持・変更判断と旧画像。
- `article-image-generation-2026-10-20.json`：組込先、生成プロンプト、使用ツール、編集内容。
- `article-image-optimization-2026-10-20.json`：既存画像の軽量化前後サイズ。

この点検は画像構成の改善です。検索流入やクリック率への効果は、この変更だけから実測済みとは判断していません。

## 再開時の整合確認

- 最新mainの冬タイヤ・共益費精算の記事と関連リンク、ニュース更新を維持して競合を解消。
- DBダイヤ・冬時間の記事はAI画像の出典とキャプションを原稿・レジストリで一致させ、以前の写真家名を継承しないよう修正。
