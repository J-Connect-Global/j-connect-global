# Tourism editorial image manifest

Generated on 2026-07-19 for the first tourism-content upgrade batch. These are AI-generated editorial images, not documentary photographs of the locations. Every published use must state that clearly in the figure caption.

## Shared production specification

- Built-in image generation mode
- Use case: `photorealistic-natural`
- Intended use: 16:9 inline image in a Japanese travel guide
- Master: 1440 x 810 WebP
- Responsive variants: 768 x 432 and 480 x 270 WebP
- Style: realistic, candid editorial travel photography with plausible human scale
- Avoid: readable text, logos, watermarks, invented landmark collages, fantasy architecture, and claims that the image is an on-location photograph
- Required caption suffix: `AI生成の編集イメージ。実際の現地写真ではありません。`

## Asset map

| Article | Master asset | Suggested insertion | Alt text | Prompt focus |
| --- | --- | --- | --- | --- |
| `bremen-weekend-trip` | `/assets/images/living/bremen-schnoor-walk-editorial-v1.webp` | Schnoor / district-choice section | ブレーメンのSchnoor地区にある細い石畳の路地を歩く旅行者 | Quiet early-morning walk through a plausible Schnoor lane with small historic houses and café tables |
| `brussels-weekend-trip` | `/assets/images/living/brussels-sablon-walk-editorial-v1.webp` | Sablon / second-day section | 雨上がりのブリュッセル・サブロン地区で地図を確認する旅行者 | Sablon art-and-café street after rain, deliberately not Grand Place |
| `copenhagen-weekend-trip` | `/assets/images/living/copenhagen-christianshavn-bike-editorial-v1.webp` | Christianshavn / mobility section | コペンハーゲンのChristianshavnで運河沿いを自転車と徒歩で移動する人々 | Everyday harbour mobility with a separated cycle lane, not a Nyhavn postcard |
| `hamburg-weekend-trip` | `/assets/images/living/hamburg-harbour-ferry-editorial-v1.webp` | harbour / HVV ferry section | ハンブルクの公共港湾フェリーからエルベ川と港を眺める乗客 | View from an ordinary harbour ferry toward the working port under changeable weather |
| `krakow-weekend-trip` | `/assets/images/living/krakow-kazimierz-courtyard-editorial-v1.webp` | Kazimierz / food-break section | クラクフのKazimierz地区にある中庭と小さなカフェで休憩する人々 | Slower Kazimierz courtyard and café break without depicting a religious or memorial site |
| `london-weekend-trip` | `/assets/images/living/london-contactless-gates-editorial-v1.webp` | TfL payment section | ロンドン地下鉄の改札で同じ決済カードをタッチする旅行者 | Practical contactless-gate moment with plausible London transit visual language |
| `munich-weekend-trip` | `/assets/images/living/munich-isar-rest-editorial-v1.webp` | Isar / outdoor-route section | ミュンヘンのIsar川沿いで休憩しながら散歩と自転車を楽しむ人々 | Relaxed Isar riverside break without Alps or beer-ad stereotypes |
| `paris-weekend-trip` | `/assets/images/living/paris-seine-walking-break-editorial-v1.webp` | Seine / first-day section | パリのセーヌ川沿いで徒歩ルートを確認しながら休憩する旅行者 | Slower lower-quay walking break without the Eiffel Tower or landmark collage |
| `prague-weekend-trip` | `/assets/images/living/prague-mala-strana-tram-editorial-v1.webp` | Malá Strana / mobility section | プラハのMalá Stranaにある坂と石畳の道を走るトラムと旅行者 | Cobblestone slope, plausible modern tram, and the choice between walking uphill and transit |
| `warsaw-weekend-trip` | `/assets/images/living/warsaw-vistula-promenade-editorial-v1.webp` | Vistula / modern-city section | ワルシャワのヴィスワ川沿いの遊歩道を歩く人と自転車で走る人 | Contemporary Vistula promenade as a counterpoint to the Old Town |

Each master has sibling `-768w.webp` and `-480w.webp` variants. The content renderer should emit their `srcset` or `<picture>` markup instead of downloading the 1440-pixel master on small screens.
