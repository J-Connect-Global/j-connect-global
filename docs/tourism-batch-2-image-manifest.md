# Tourism Batch 2: editorial image manifest

## Global rules

- These are AI-generated editorial images, not documentary evidence of current local conditions.
- Keep every existing hero image unchanged.
- Use exactly one new editorial image in each target article.
- Put the disclosure at the end of every image title/caption exactly as follows:

  `AI生成の編集イメージ。実際の現地写真ではありません。`

- The master and responsive siblings are already supplied under `assets/images/living/`:
  - master: 1440×810 WebP
  - `-768w`: 768×432 WebP
  - `-480w`: 480×270 WebP
- Use the normal Markdown image syntax with the master URL. The generic renderer merged in PR #299 must discover the responsive siblings; do not hard-code these ten names into the renderer.

## Per-article placement

### `aachen-day-trip`

- Master: `/assets/images/living/aachen-printen-break-editorial-v1.webp`
- Alt: `アーヘン旧市街の屋外席でPrintenとコーヒーを楽しむ旅行者`
- Caption: `旧市街の移動を一度止め、Printenを少量試しながら午後の優先順位を決めます。AI生成の編集イメージ。実際の現地写真ではありません。`
- Place: after the section that explains Printen/café breaks and before the afternoon-route decision.

### `amsterdam-weekend-trip`

- Master: `/assets/images/living/amsterdam-bike-lane-crossing-editorial-v1.webp`
- Alt: `アムステルダムの赤い自転車レーン手前で通過を待つ旅行者`
- Caption: `赤い自転車レーンは歩道ではありません。左右と後方を確認し、自転車が通過してから横断します。AI生成の編集イメージ。実際の現地写真ではありません。`
- Place: in the bicycle-lane safety section, before route planning resumes.

### `berlin-weekend-trip`

- Master: `/assets/images/living/berlin-transit-transfer-editorial-v1.webp`
- Alt: `ベルリンの公共交通駅で地図とエレベーター動線を確認する旅行者`
- Caption: `最短経路と段差の少ない経路は一致しないことがあります。乗換駅ではエレベーターの位置まで確認します。AI生成の編集イメージ。実際の現地写真ではありません。`
- Place: in the BVG zones/transfers/accessibility section.

### `cologne-city-guide`

- Master: `/assets/images/living/cologne-rhine-handsfree-walk-editorial-v1.webp`
- Alt: `小さなデイパックでケルンのライン川沿いを歩く旅行者`
- Caption: `中央駅で大きな荷物を預けてから川沿いへ進むと、混雑と橋の歩行が楽になります。AI生成の編集イメージ。実際の現地写真ではありません。`
- Place: after the station/luggage decision and before the Rhine/Deutz route.

### `cologne-family-trip`

- Master: `/assets/images/living/cologne-rheinpark-family-rest-editorial-v1.webp`
- Alt: `ケルンのライン川沿いの公園でベビーカーと休憩する家族`
- Caption: `子どもの自由時間と大人の休憩を同じ場所で確保し、次の屋内施設へ進むかをここで決めます。AI生成の編集イメージ。実際の現地写真ではありません。`
- Place: in the Rheinpark/rest-stop section, before the family decision tree.

### `duesseldorf-city-guide`

- Master: `/assets/images/living/duesseldorf-japanese-quarter-choice-editorial-v1.webp`
- Alt: `デュッセルドルフ日本人街で昼食候補を見比べる旅行者`
- Caption: `日本人街は昼の混雑を前提に候補を二つ持ち、待ち時間が長ければ買い物を先に済ませます。AI生成の編集イメージ。実際の現地写真ではありません。`
- Place: in the Japanese Quarter/Immermannstraße section.

### `duesseldorf-family-trip`

- Master: `/assets/images/living/duesseldorf-family-park-rest-editorial-v1.webp`
- Alt: `デュッセルドルフの舗装された公園路でベビーカーと休憩する家族`
- Caption: `舗装路、ベンチ、日陰を一つの短い周回に入れ、疲れた人が出た時点で折り返します。AI生成の編集イメージ。実際の現地写真ではありません。`
- Place: in the Nordpark or equivalent stroller-friendly route section.

### `nrw-nature-relax-guide`

- Master: `/assets/images/living/nrw-lakeside-short-loop-editorial-v1.webp`
- Alt: `NRWの湖畔の森で短い周回ルートを地図で選ぶ家族`
- Caption: `到着時に路面と体調を確認し、最初から長いコースへ入らず戻りやすい周回を選びます。AI生成の編集イメージ。実際の現地写真ではありません。`
- Place: after the comparison table and before the detailed route examples.

### `rhine-river-relax-guide`

- Master: `/assets/images/living/rhine-regional-train-walk-editorial-v1.webp`
- Alt: `ライン川沿いの遊歩道で地域列車を見ながら帰路を確認する旅行者`
- Caption: `歩き切ることを目的にせず、並行する鉄道や船の時刻を使って短縮できる計画にします。AI生成の編集イメージ。実際の現地写真ではありません。`
- Place: in the rail-friendly route/shortening section.

### `strasbourg-weekend-trip`

- Master: `/assets/images/living/strasbourg-tram-arrival-editorial-v1.webp`
- Alt: `ストラスブール中心部の低床トラムから降りる週末旅行者`
- Caption: `車で旧市街へ入り続けず、P+Rや駅から低床トラムへ切り替えると中心部の移動を短くできます。AI生成の編集イメージ。実際の現地写真ではありません。`
- Place: after the arrival-method comparison and before the first walking route.
