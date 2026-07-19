# 全20観光記事: 概略ルート図マニフェスト

これは確定座標ではなく、調査・編集時の構成案である。Codexは現行の公式観光地図・交通案内等で方向関係を確認し、第三者の地図表現をトレースせず、地理的事実だけを使ってオリジナル図を作る。

共通ファイル名:

- desktop: `/assets/images/living/routes/{slug}-route-overview.svg`
- mobile: `/assets/images/living/routes/{slug}-route-overview-mobile.svg`

## ドイツ国内・NRW

| slug | 基本ルート | 任意の分岐・補足 |
| --- | --- | --- |
| `aachen-day-trip` | Aachen Hbf → Elisenbrunnen → Dom/Katschhof → Rathaus/Markt → Printen休憩 | 温泉施設は日帰り観光とは別分岐 |
| `berlin-weekend-trip` | Berlin Hbf → Reichstag → Brandenburger Tor → Holocaust-Mahnmal → Unter den Linden → Museumsinsel | 2日目は壁・博物館・地区散策から一つ |
| `bremen-weekend-trip` | Bremen Hbf → Marktplatz → Böttcherstraße → Schnoor → Schlachte | Viertelは翌日の追加候補 |
| `cologne-city-guide` | Köln Hbf/Dom → Altstadt → Rheinufer → Hohenzollernbrücke → Deutz側 | 疲れた場合は橋を渡らず駅へ戻る |
| `cologne-family-trip` | 到着地点 → 家族向け屋内アンカー → Rheinpark等の屋外休憩 → 帰路 | 年齢・天候で動物園/博物館等を一つ選択。実施設は再調査後に確定 |
| `duesseldorf-city-guide` | Düsseldorf Hbf → Immermannstraße → Königsallee → Altstadt/Burgplatz → Rheinufer | MedienHafenは時間がある場合のみ |
| `duesseldorf-family-trip` | 到着地点 → Nordpark系の短い舗装ルート → 家族向け屋内アンカー → 帰路 | Aquazoo等は営業・予約を再調査後に確定 |
| `hamburg-weekend-trip` | Hamburg Hbf → Rathaus → Speicherstadt → HafenCity/Elbphilharmonie → Landungsbrücken | HVVフェリーは運航時の追加、Alsterは別日の分岐 |
| `munich-weekend-trip` | München Hbf/Karlsplatz → Marienplatz → Residenz周辺 | KunstarealまたはIsar/Englischer Gartenを一つ選ぶ |
| `nrw-nature-relax-guide` | NRW主要都市と、再調査後に選ぶ具体的な4〜6自然候補の相対位置 | 都市公園・湖畔・森林・起伏ありを色分けし、記事内比較表と一致させる |
| `rhine-river-relax-guide` | 再調査後に確定するライン川沿い3〜5区間を南北方向に表示 | 鉄道・船・徒歩の短縮ポイントを明示 |

## ドイツから行く国外旅行

| slug | 基本ルート | 任意の分岐・補足 |
| --- | --- | --- |
| `amsterdam-weekend-trip` | Amsterdam Centraal → Canal Belt → Jordaan/De 9 Straatjes → Museumplein | Vondelparkは休憩、予約施設は一つだけ固定 |
| `brussels-weekend-trip` | Bruxelles-Central → Grand-Place → Mont des Arts → Sablon → Marolles | EU地区は別目的の分岐 |
| `copenhagen-weekend-trip` | København H → Tivoli周辺 → Indre By → Nyhavn → Christianshavn | 空港線、港、チボリの営業を別レイヤーで示す |
| `krakow-weekend-trip` | Kraków Główny → Rynek → Wawel → Kazimierz | 川沿いは天候が良い場合のみ |
| `london-weekend-trip` | 到着空港/主要駅 → 宿 → Westminster → South Bank | 2日目は一地区または一館へ分岐。空港別導線を混在させない |
| `paris-weekend-trip` | 到着駅/宿 → Marais → Seine → 選んだ美術館 | LouvreとOrsayは選択分岐。空港経路は別枠 |
| `prague-weekend-trip` | Praha hlavní nádraží/宿 → Staré Město → Karlův most → tramで城側へ → Malá Stranaへ下る | 上りは公共交通、下りは徒歩として明示 |
| `strasbourg-weekend-trip` | Gare Centrale/P+R → Petite France → Grande Île → Cathédrale周辺 → 川沿い/帰路 | 鉄道到着とP+R到着を入口で分ける |
| `warsaw-weekend-trip` | Warszawa Centralna/宿 → Royal Route → Old Town | 2日目は博物館またはVistula/Powiśleへ分岐 |

## 図の表示要件

- 各図は4〜7ノードに絞る。本文の全スポットを詰め込まない。
- ノード名、移動方向、徒歩/公共交通、任意分岐を識別できること。
- desktopは位置関係、mobileは読む順番を優先して再配置する。
- 色だけに依存せず、実線/破線、ラベル、記号を併用する。
- SVG内の日本語テキストはブラウザで表示されるsystem font stackを使い、外部フォントを読み込まない。
- 図の直後に「縮尺図ではない」「所要時間・運行は当日確認」のキャプションを置く。
