# J-Connect Germany content cycle — 2026-11-03

## 実行範囲と前提

- 対象：公開サイト https://j-connect-global.com/germany/ja/ および GitHub リポジトリ `J-Connect-Global/j-connect-global`
- ドイツ現地確認日時：2026-11-03 04:04 CET
- Notion の「J-Connect Germany | Growth & Content」Project Instructions は、Notion コネクタが追加のユーザー入力を要求したため取得できなかった。
- リポジトリ直下に README は見当たらなかった。代わりに `.github/agents/jconnect-content.agent.md`、`.github/agents/jconnect-seo.agent.md`、`docs/content-production-workflow.md` を確認した。
- 指示に従い、main へ直接 push せず、未公開ドラフトを含む draft PR とした。

## サイトと重複確認

- 現行 sitemap：193 URL。すべて `/germany/ja/` 配下で、英語・ドイツ語ページは sitemap に含まれていない。
- 公開コンテンツ registry：living 68件、events 102件。
- 直近の公開・更新は2026-11-01が中心。C033「ドイツの聖マルティン祭」はすでに公開済みのため、同テーマの新規記事は作成していない。
- 今回の新規テーマ（EU小口輸入の2ユーロ取扱手数料／d-you EUDI Wallet）は、既存の公開 registry 内に同一検索意図の記事がないことを確認した。

## 既存の未完了PR

- PR #420「既存記事3本を更新：ETIAS運用状況・冬タイヤ罰則・2027年ミニジョブ」：open / draft。対象はEES・ETIAS、冬タイヤ、2027年ミニジョブ。CIは確認時点で成功。法令・運用状況の最終確認と人手レビューが必要。
- PR #421「N023更新：2027年の医療保険・介護保険の上限を分離して訂正」：open / ready for review。CIは確認時点で成功。2027年の介護保険上限6,075ユーロ/月は、BMASの2027年表とSGB XI §55(2)の参照条文で裏付けられる。ただしBMASは同規則が連邦参議院の同意前であると明記しているため、正式公布前に確定値として公開しない。
- 両PRは `docs/jc-content-cycle-2026-11-02-provenance.md` と `sitemap.xml` を変更している。現時点でGitHubは双方をmergeableとしているが、片方を先にmergeすると、もう片方の同一 provenance ファイルの統合・再確認が必要になる可能性がある。
- いずれも今回の実行ではmergeしていない。コンテンツ全般の自動公開承認は確認できず、PR #420 はdraftのまま維持した。

## 新規ドラフト

### L074 — 日本からドイツに届く荷物の関税・手数料

- 2026-11-01開始のEU取扱手数料2ユーロと、2026-07-01開始の150ユーロ以下の対象通販に対する3ユーロ定額関税を分離。
- 「荷物1個」「商品1個」「税関上の品目」を混同しないよう、EU規則2026/2108の品目定義を反映。
- 個人間ギフトの45ユーロ免税条件と、通販の距離販売を区別。
- 次回確認：2026-11-10（配送会社の請求実務・税関案内の更新を確認）。
- 要レビュー：税関・輸入税の専門確認。画像は未使用。出典の権利・ライセンス問題を避けるため、無出典画像は追加していない。

### L075 — d-you / EUDI Wallet

- 連邦議会の2026-10-15可決、連邦参議院の2026-11-20第二読会予定、2027-01-02の開始目標を区別。
- EU枠組みは居住者を対象に含む一方、第三国籍住民のドイツ版初期登録書類は未確認と明記。
- 初期版の機能制限と仮名利用機能に関する公聴会・議会決議を反映。
- 次回確認：2026-11-21（連邦参議院審議後）。
- 要レビュー：法案の最終成立状況、第三国籍住民の登録条件、正式なアプリ配布先。

両記事は registry で `published:false`、`status:draft`、home/hub/search/sitemap 非表示とした。公開ページ、検索インデックス、canonical、hreflang、sitemap の生成物には変更を加えていない。

## Search Console・競合調査

- GSC Wizard のサイト一覧取得は接続／契約ゲートで停止し、検索クエリ・表示回数・CTR・平均掲載順位を取得できなかった。実績値は一切推定していない。
- サイト内の既存記事・slug・registryを確認し、同一検索意図の重複を避けた。
- EU取扱手数料はEU理事会・欧州委員会・EUR-Lexが一次情報。二次情報では配送会社・英語圏の解説が見つかったが、記事の金額・対象・品目定義は一次法令を優先。
- d-youは連邦政府・連邦議会・EU委員会・EU規則を優先。日本語の同一テーマ記事は現行サイト内で確認されなかった。

## J-Connect既存機能の優先確認

- 本番の公開コミュニティ投稿ページを読み取り専用で確認。公開返信・非公開返信の選択肢と送信UIが表示された。フォーム送信・通知メール送信は行っていない。
- 公開APIの `communityMessagingStatus` は version `2026-10-23.1` を返し、`publicReplies`、`privateReplies`、`permanentLinks`、`emailNotifications`、`recoveryFlow` がすべて true。
- 会話ページの回復フォームと noindex / no-referrer の実装をコードで確認。
- ただし、実在する安全なテスト受信箱とApps Script管理セッションがないため、実メール配信・受信後のリンク開封・再送メールの end-to-end は未検証。既存投稿者にテスト通知を送っていない。従って「非公開メッセージ問題が完全解決」とは扱わない。
- 既存の投稿、求人、フォーム、管理、学習ツール、プライバシー関連コードは変更していない。

## 検証と制約

- GitHub APIによるリポジトリ・PR・ファイル・sitemap確認は実施。
- ローカルの `git clone` は実行環境のネットワーク制限で失敗したため、ローカル build / validate / browser regression suite は実行していない。
- このPRは未公開ドラフトのみを追加し、GitHub Actions のPR checksで検証する。CI成功後も、法的レビューと明示的な公開判断まではdraftのままとする。
- ChatGPT Work の専用実行環境およびSearch Console実測データは、この実行枠から利用できなかった。公開ページの読み取りとTinyFishブラウザ smoke test、GitHub APIを使用した。

## 次の作業候補

1. PR #420 / #421 のレビューと同一 provenance ファイルの統合方針を確定。
2. L074 の配送会社・税関の実務反映を再確認し、専門レビュー後に公開判断。
3. 2026-11-20 の連邦参議院審議後に L075 を再検証。
4. 安全なテスト受信箱とApps Script管理アクセスを確保できる場合のみ、非公開メッセージの実メール end-to-end を検証。
