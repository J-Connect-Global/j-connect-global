import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "assets/data/learn-german/flashcards");
const verifiedDate = "2026-08-02";
const generatedDate = "2026-08-09";

const sceneLabels = {
  daily: "日常",
  shopping: "買い物",
  administration: "外国人局・役所",
  medical: "病院・薬局",
  housing: "住まい",
  "kita-school": "Kita・学校",
  work: "仕事"
};

const card = (id, lemma, display, unitType, partOfSpeech, japanese, exampleDe, exampleJa, scenes, grammar, collocations, learningNote, relatedTerms) => ({
  id,
  lemma,
  display_de: display,
  unit_type: unitType,
  part_of_speech: partOfSpeech,
  japanese,
  example_de: exampleDe,
  example_ja: exampleJa,
  scenes,
  grammar,
  collocations,
  learning_note: learningNote,
  related_terms: relatedTerms
});

const rawCards = {
  A1: [
    card("a1-001", "Termin", "der Termin", "word", "noun", "予約、約束の日時", "Ich habe morgen einen Termin beim Arzt.", "明日は医師の予約があります。", ["daily", "medical"], { article: "der", plural: "Termine" }, ["einen Termin haben", "einen Termin vereinbaren"], "予定そのものより、予約した日時を表すときによく使います。", ["die Uhrzeit", "die Vereinbarung"]),
    card("a1-002", "Uhrzeit", "die Uhrzeit", "word", "noun", "時刻", "Welche Uhrzeit passt Ihnen?", "何時がご都合よいですか。", ["daily", "administration"], { article: "die", plural: "Uhrzeiten" }, ["eine Uhrzeit nennen", "um diese Uhrzeit"], "時刻を尋ねる表現は Wie spät? だけでなく Welche Uhrzeit? も使います。", ["die Uhr", "der Termin"]),
    card("a1-003", "heute", "heute", "word", "adverb", "今日", "Heute arbeite ich von zu Hause.", "今日は在宅で働きます。", ["daily", "work"], { usage: "時を表す副詞。文頭では直後に動詞が来ます。" }, ["heute Morgen", "noch heute"], "文頭に置くと Heute arbeite ich ... の語順になります。", ["morgen", "gestern"]),
    card("a1-004", "morgen", "morgen", "word", "adverb", "明日", "Morgen hole ich mein Kind früher ab.", "明日は子どもを早めに迎えに行きます。", ["daily", "kita-school"], { usage: "小文字の morgen は『明日』。大文字の Morgen は『朝』です。" }, ["bis morgen", "morgen früh"], "Morgen と morgen の大文字・小文字で意味が変わります。", ["heute", "der Morgen"]),
    card("a1-005", "brauchen", "brauchen", "word", "verb", "必要とする", "Ich brauche dieses Formular.", "この用紙が必要です。", ["daily", "administration"], { third_person: "braucht", past_participle: "gebraucht", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ" }, ["Hilfe brauchen", "etwas dringend brauchen"], "目的語は4格です。丁寧な依頼では Ich brauche ... より Ich bräuchte ... も使われます。", ["benötigen", "müssen"]),
    card("a1-006", "helfen", "helfen", "word", "verb", "手伝う、助ける", "Können Sie mir bitte helfen?", "手伝っていただけますか。", ["daily", "administration", "medical"], { third_person: "hilft", past_participle: "geholfen", auxiliary: "haben", separable: false, reflexive: false, government: "Dativ" }, ["jemandem helfen", "bei etwas helfen"], "人は3格にします。mir、dir、ihm などの形に注意してください。", ["die Hilfe", "unterstützen"]),
    card("a1-007", "verstehen", "verstehen", "word", "verb", "理解する、聞き取る", "Entschuldigung, ich verstehe das nicht.", "すみません、それが分かりません。", ["daily", "administration", "medical"], { third_person: "versteht", past_participle: "verstanden", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ" }, ["gut verstehen", "nicht ganz verstehen"], "聞き取れないときにも内容が理解できないときにも使えます。", ["erklären", "wiederholen"]),
    card("a1-008", "wiederholen", "wiederholen", "word", "verb", "繰り返す", "Können Sie das bitte wiederholen?", "もう一度言っていただけますか。", ["daily", "administration", "medical"], { third_person: "wiederholt", past_participle: "wiederholt", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ" }, ["eine Frage wiederholen", "bitte wiederholen"], "接頭辞 wieder- があっても、この意味の wiederholen は非分離動詞です。", ["noch einmal", "verstehen"]),
    card("a1-009", "langsam", "langsam", "word", "adjective", "ゆっくりした、ゆっくり", "Bitte sprechen Sie etwas langsamer.", "もう少しゆっくり話してください。", ["daily", "administration", "medical"], { usage: "形容詞・副詞。依頼では比較級 langsamer が自然です。" }, ["langsam sprechen", "etwas langsamer"], "『ゆっくり話してください』は Bitte sprechen Sie langsam. より etwas langsamer が柔らかい表現です。", ["schnell", "deutlich"]),
    card("a1-010", "Entschuldigung", "die Entschuldigung", "word", "noun", "すみません、謝罪", "Entschuldigung, wo ist die Kasse?", "すみません、レジはどこですか。", ["daily", "shopping"], { article: "die", plural: "Entschuldigungen" }, ["um Entschuldigung bitten", "Entschuldigung sagen"], "呼びかけや軽い謝罪では単独で Entschuldigung! と使えます。", ["entschuldigen", "Verzeihung"]),
    card("a1-011", "kosten", "kosten", "word", "verb", "値段が〜である", "Wie viel kostet diese Jacke?", "このジャケットはいくらですか。", ["shopping"], { third_person: "kostet", past_participle: "gekostet", auxiliary: "haben", separable: false, reflexive: false, government: "価格を補語として取る" }, ["zehn Euro kosten", "Wie viel kostet ...?"], "値段を尋ねる定番表現です。人が費用を負担する意味では4格も使います。", ["der Preis", "bezahlen"]),
    card("a1-012", "bezahlen", "bezahlen", "word", "verb", "支払う", "Kann ich mit Karte bezahlen?", "カードで支払えますか。", ["shopping"], { third_person: "bezahlt", past_participle: "bezahlt", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ または支払手段 mit + Dativ" }, ["bar bezahlen", "mit Karte bezahlen"], "支払手段は mit Karte、bar は前置詞なしで使います。", ["zahlen", "die Kasse"]),
    card("a1-013", "Kasse", "die Kasse", "word", "noun", "レジ、会計", "Die Kasse ist dort hinten.", "レジはあちらの奥です。", ["shopping"], { article: "die", plural: "Kassen" }, ["an der Kasse", "zur Kasse gehen"], "会計場所は an der Kasse と表します。", ["der Kassenbon", "bezahlen"]),
    card("a1-014", "Tüte", "die Tüte", "word", "noun", "袋", "Brauchen Sie eine Tüte?", "袋は必要ですか。", ["shopping"], { article: "die", plural: "Tüten" }, ["eine Tüte brauchen", "eine Tüte mitnehmen"], "スーパーでは袋が有料のことが多く、レジでよく聞かれます。", ["die Tasche", "der Beutel"]),
    card("a1-015", "Kassenbon", "der Kassenbon", "word", "noun", "レシート", "Möchten Sie den Kassenbon?", "レシートは必要ですか。", ["shopping"], { article: "der", plural: "Kassenbons" }, ["den Kassenbon behalten", "mit Kassenbon"], "返品に備えてレシートを保管するときは den Kassenbon behalten と言えます。", ["die Quittung", "die Kasse"]),
    card("a1-016", "Pfand", "das Pfand", "word", "noun", "デポジット、預かり金", "Auf die Flasche zahlt man Pfand.", "そのボトルにはデポジットを払います。", ["shopping"], { article: "das", plural: "Pfänder" }, ["Pfand zahlen", "Pfand zurückbekommen"], "飲料容器の制度では通常単数・無冠詞で Pfand と言います。", ["der Pfandbon", "die Flasche"]),
    card("a1-017", "Flasche", "die Flasche", "word", "noun", "ボトル、瓶", "Diese Flasche gehört in den Pfandautomaten.", "このボトルは返却機に入れます。", ["shopping"], { article: "die", plural: "Flaschen" }, ["eine Flasche Wasser", "leere Flaschen"], "中身を表すときは eine Flasche Wasser のように使います。", ["das Pfand", "der Pfandautomat"]),
    card("a1-018", "zurückgeben", "zurückgeben", "word", "verb", "返す、返品する", "Ich möchte diese Hose zurückgeben.", "このズボンを返品したいです。", ["shopping"], { third_person: "gibt zurück", past_participle: "zurückgegeben", auxiliary: "haben", separable: true, reflexive: false, government: "Akkusativ" }, ["Ware zurückgeben", "eine Flasche zurückgeben"], "分離動詞なので現在形では zurück が文末に来ます。", ["umtauschen", "zurückbringen"]),
    card("a1-019", "Formular", "das Formular", "word", "noun", "申請用紙、フォーム", "Bitte füllen Sie dieses Formular aus.", "この用紙に記入してください。", ["administration"], { article: "das", plural: "Formulare" }, ["ein Formular ausfüllen", "ein Formular abgeben"], "記入するは ausfüllen、提出するは abgeben と組み合わせます。", ["der Antrag", "die Unterschrift"]),
    card("a1-020", "Ausweis", "der Ausweis", "word", "noun", "身分証明書", "Bitte zeigen Sie Ihren Ausweis.", "身分証明書を見せてください。", ["administration"], { article: "der", plural: "Ausweise" }, ["den Ausweis zeigen", "ein gültiger Ausweis"], "パスポートを特定して言う場合は Reisepass を使います。", ["der Reisepass", "das Dokument"]),
    card("a1-021", "Unterschrift", "die Unterschrift", "word", "noun", "署名", "Hier fehlt noch Ihre Unterschrift.", "ここにまだ署名が必要です。", ["administration", "housing"], { article: "die", plural: "Unterschriften" }, ["eine Unterschrift leisten", "hier unterschreiben"], "日常会話では名詞より動詞 unterschreiben もよく使います。", ["unterschreiben", "der Vertrag"]),
    card("a1-022", "sich anmelden", "sich anmelden", "phrase", "verb", "登録する、住民登録をする", "Ich möchte mich in Düsseldorf anmelden.", "デュッセルドルフで住民登録をしたいです。", ["administration"], { third_person: "meldet sich an", past_participle: "angemeldet", auxiliary: "haben", separable: true, reflexive: true, government: "sich (Akkusativ) anmelden; bei + Dativ / für + Akkusativ" }, ["sich beim Bürgeramt anmelden", "einen Wohnsitz anmelden"], "人が登録する場合は再帰形、住所を登録する場合は einen Wohnsitz anmelden とします。", ["die Anmeldung", "abmelden"]),
    card("a1-023", "Nummer", "die Nummer", "word", "noun", "番号", "Bitte warten Sie, bis Ihre Nummer aufgerufen wird.", "番号が呼ばれるまでお待ちください。", ["administration", "daily"], { article: "die", plural: "Nummern" }, ["eine Nummer ziehen", "die Nummer aufrufen"], "役所の待合では eine Nummer ziehen がよく使われます。", ["warten", "der Schalter"]),
    card("a1-024", "warten", "warten", "word", "verb", "待つ", "Ich warte auf meinen Termin.", "予約の時間を待っています。", ["administration", "medical", "daily"], { third_person: "wartet", past_participle: "gewartet", auxiliary: "haben", separable: false, reflexive: false, government: "auf + Akkusativ" }, ["auf jemanden warten", "kurz warten"], "待つ対象には auf + 4格を使います。", ["die Wartezeit", "der Termin"]),
    card("a1-025", "Arzt", "der Arzt", "word", "noun", "男性医師、医師", "Der Arzt kommt gleich.", "医師はすぐ来ます。", ["medical"], { article: "der", plural: "Ärzte" }, ["zum Arzt gehen", "einen Arzttermin haben"], "女性医師は Ärztin です。zum Arzt は zu dem Arzt の縮約です。", ["die Ärztin", "die Praxis"]),
    card("a1-026", "Ärztin", "die Ärztin", "word", "noun", "女性医師、医師", "Die Ärztin untersucht mein Knie.", "医師が私の膝を診察します。", ["medical"], { article: "die", plural: "Ärztinnen" }, ["bei der Ärztin", "die behandelnde Ärztin"], "職業名の女性形は -in、複数形は -innen になります。", ["der Arzt", "untersuchen"]),
    card("a1-027", "Apotheke", "die Apotheke", "word", "noun", "薬局", "Die nächste Apotheke ist um die Ecke.", "最寄りの薬局は角を曲がったところです。", ["medical"], { article: "die", plural: "Apotheken" }, ["in der Apotheke", "eine Apotheke in der Nähe"], "夜間・休日は Notdienst の薬局を探します。", ["das Medikament", "das Rezept"]),
    card("a1-028", "krank", "krank", "word", "adjective", "病気の、具合が悪い", "Mein Kind ist heute krank.", "子どもは今日具合が悪いです。", ["medical", "kita-school"], { usage: "主に sein と使う述語用法。比較級 kränker、最上級 am kränksten。" }, ["krank sein", "sich krankmelden"], "一時的な体調不良には Ich bin krank. が自然です。", ["gesund", "die Krankheit"]),
    card("a1-029", "Schmerzen", "die Schmerzen", "word", "noun", "痛み", "Ich habe seit gestern starke Schmerzen.", "昨日から強い痛みがあります。", ["medical"], { article: "die", plural: "通常は複数形 Schmerzen; 単数 Schmerz も可" }, ["Schmerzen haben", "starke Schmerzen"], "痛みを訴えるときは Ich habe Schmerzen. と複数形をよく使います。", ["weh tun", "der Schmerz"]),
    card("a1-030", "Rezept", "das Rezept", "word", "noun", "処方箋、レシピ", "Ich habe ein Rezept vom Arzt.", "医師から処方箋をもらっています。", ["medical"], { article: "das", plural: "Rezepte" }, ["ein Rezept einlösen", "ein Rezept bekommen"], "医療の文脈では処方箋、料理ではレシピという意味です。", ["das E-Rezept", "das Medikament"]),
    card("a1-031", "Tablette", "die Tablette", "word", "noun", "錠剤", "Nehmen Sie morgens eine Tablette.", "朝に錠剤を1錠飲んでください。", ["medical"], { article: "die", plural: "Tabletten" }, ["eine Tablette nehmen", "zweimal täglich eine Tablette"], "薬の数え方は eine Tablette、服用は nehmen/einnehmen を使います。", ["das Medikament", "einnehmen"]),
    card("a1-032", "einnehmen", "einnehmen", "word", "verb", "（薬を）服用する", "Wie soll ich das Medikament einnehmen?", "この薬はどう服用すればよいですか。", ["medical"], { third_person: "nimmt ein", past_participle: "eingenommen", auxiliary: "haben", separable: true, reflexive: false, government: "Akkusativ" }, ["ein Medikament einnehmen", "vor dem Essen einnehmen"], "分離動詞です。食前は vor dem Essen、食後は nach dem Essen。", ["nehmen", "die Dosierung"]),
    card("a1-033", "Wohnung", "die Wohnung", "word", "noun", "住居、アパート", "Wir suchen eine Wohnung mit drei Zimmern.", "私たちは3部屋の住居を探しています。", ["housing"], { article: "die", plural: "Wohnungen" }, ["eine Wohnung suchen", "eine Wohnung mieten"], "ドイツ語の Zimmer 数は通常、居間と寝室を数え、台所・浴室は含めません。", ["das Zimmer", "mieten"]),
    card("a1-034", "Miete", "die Miete", "word", "noun", "家賃", "Die Miete ist am Monatsanfang fällig.", "家賃は月初に支払期限です。", ["housing"], { article: "die", plural: "Mieten" }, ["Miete zahlen", "die monatliche Miete"], "賃貸物件そのものは Wohnung、支払う家賃は Miete です。", ["die Kaltmiete", "die Nebenkosten"]),
    card("a1-035", "Schlüssel", "der Schlüssel", "word", "noun", "鍵", "Ich habe meinen Schlüssel verloren.", "鍵をなくしました。", ["housing", "daily"], { article: "der", plural: "Schlüssel" }, ["den Schlüssel abgeben", "einen Ersatzschlüssel"], "単数形と複数形が同じです。", ["die Tür", "abschließen"]),
    card("a1-036", "kaputt", "kaputt", "word", "adjective", "壊れた", "Die Heizung ist kaputt.", "暖房が壊れています。", ["housing", "daily"], { usage: "口語的な形容詞。sein と使うほか kaputtgehen、kaputtmachen にもなる。" }, ["kaputt sein", "kaputtgehen"], "大家への連絡では kaputt に加えて具体的な症状を伝えると明確です。", ["defekt", "reparieren"]),
    card("a1-037", "Heizung", "die Heizung", "word", "noun", "暖房設備", "Die Heizung wird nicht warm.", "暖房が暖かくなりません。", ["housing"], { article: "die", plural: "Heizungen" }, ["die Heizung einschalten", "die Heizung reparieren"], "暖房が効かないときは wird nicht warm が具体的で自然です。", ["der Heizkörper", "warm"]),
    card("a1-038", "Vermieter", "der Vermieter", "word", "noun", "男性の大家、賃貸人", "Ich rufe den Vermieter an.", "大家に電話します。", ["housing"], { article: "der", plural: "Vermieter" }, ["den Vermieter informieren", "mit dem Vermieter sprechen"], "管理会社の場合は Hausverwaltung を使います。", ["die Vermieterin", "der Mieter"]),
    card("a1-039", "Vermieterin", "die Vermieterin", "word", "noun", "女性の大家、賃貸人", "Die Vermieterin kommt am Freitag vorbei.", "大家は金曜日に立ち寄ります。", ["housing"], { article: "die", plural: "Vermieterinnen" }, ["die Vermieterin kontaktieren", "der Vermieterin schreiben"], "schreiben の相手は3格なので der Vermieterin になります。", ["der Vermieter", "die Hausverwaltung"]),
    card("a1-040", "Kind", "das Kind", "word", "noun", "子ども", "Mein Kind geht seit August in die Kita.", "私の子どもは8月からKitaに通っています。", ["kita-school", "daily"], { article: "das", plural: "Kinder" }, ["ein Kind anmelden", "das Kind abholen"], "所有冠詞 mein の後では中性1格なので mein Kind です。", ["die Kinder", "die Eltern"]),
    card("a1-041", "Kita", "die Kita", "word", "noun", "保育施設（Kindertagesstätte）", "Die Kita öffnet um sieben Uhr.", "Kitaは7時に開きます。", ["kita-school"], { article: "die", plural: "Kitas" }, ["in die Kita gehen", "einen Kita-Platz suchen"], "Kita は Kindertagesstätte の一般的な略称です。", ["der Kita-Platz", "die Betreuung"]),
    card("a1-042", "Schule", "die Schule", "word", "noun", "学校", "Die Schule beginnt nächste Woche.", "学校は来週始まります。", ["kita-school"], { article: "die", plural: "Schulen" }, ["zur Schule gehen", "in der Schule"], "移動は zur Schule、場所は in der Schule と使い分けます。", ["der Unterricht", "die Klasse"]),
    card("a1-043", "abholen", "abholen", "word", "verb", "迎えに行く、受け取る", "Ich hole meine Tochter um vier Uhr ab.", "4時に娘を迎えに行きます。", ["kita-school", "daily"], { third_person: "holt ab", past_participle: "abgeholt", auxiliary: "haben", separable: true, reflexive: false, government: "Akkusativ" }, ["ein Kind abholen", "ein Paket abholen"], "人にも荷物にも使える分離動詞です。", ["bringen", "mitnehmen"]),
    card("a1-044", "fehlen", "fehlen", "word", "verb", "欠席する、足りない", "Mein Sohn fehlt heute in der Schule.", "息子は今日学校を欠席します。", ["kita-school", "work"], { third_person: "fehlt", past_participle: "gefehlt", auxiliary: "haben", separable: false, reflexive: false, government: "欠席は主語 + fehlen; 不足は jemandem (Dativ) fehlt etwas" }, ["in der Schule fehlen", "bei der Arbeit fehlen"], "『私には〜が足りない』では Mir fehlt ... と3格を使います。", ["abwesend", "krank"]),
    card("a1-045", "Betreuung", "die Betreuung", "word", "noun", "保育、世話、サポート", "Wir brauchen Betreuung bis 16 Uhr.", "16時までの保育が必要です。", ["kita-school"], { article: "die", plural: "Betreuungen" }, ["ganztägige Betreuung", "Betreuung organisieren"], "Kitaや放課後の保育時間を表すときに使います。", ["betreuen", "die Betreuungszeit"]),
    card("a1-046", "Arbeit", "die Arbeit", "word", "noun", "仕事、作業", "Ich fahre um acht Uhr zur Arbeit.", "8時に仕事へ行きます。", ["work", "daily"], { article: "die", plural: "Arbeiten" }, ["zur Arbeit fahren", "bei der Arbeit"], "職場へは zur Arbeit、仕事中は bei der Arbeit と言います。", ["arbeiten", "der Arbeitsplatz"]),
    card("a1-047", "Kollege", "der Kollege", "word", "noun", "男性の同僚", "Mein Kollege hilft mir heute.", "今日は同僚が手伝ってくれます。", ["work"], { article: "der", plural: "Kollegen", declension: "弱変化名詞: den Kollegen, dem Kollegen" }, ["ein neuer Kollege", "mit einem Kollegen"], "Kollege は弱変化名詞で、1格単数以外では -n が付きます。", ["die Kollegin", "das Team"]),
    card("a1-048", "Kollegin", "die Kollegin", "word", "noun", "女性の同僚", "Ich frage meine Kollegin.", "同僚に尋ねます。", ["work"], { article: "die", plural: "Kolleginnen" }, ["eine nette Kollegin", "mit der Kollegin sprechen"], "複数形は -innen です。", ["der Kollege", "das Team"]),
    card("a1-049", "anfangen", "anfangen", "word", "verb", "始める、始まる", "Die Besprechung fängt um zehn Uhr an.", "会議は10時に始まります。", ["work", "daily"], { third_person: "fängt an", past_participle: "angefangen", auxiliary: "haben", separable: true, reflexive: false, government: "mit + Dativ / um + 時刻" }, ["mit der Arbeit anfangen", "um neun Uhr anfangen"], "現在形では母音が a→ä に変わり、an は文末へ移動します。", ["beginnen", "aufhören"]),
    card("a1-050", "Besprechung", "die Besprechung", "word", "noun", "打ち合わせ、会議", "Wir haben um elf Uhr eine Besprechung.", "11時に打ち合わせがあります。", ["work"], { article: "die", plural: "Besprechungen" }, ["eine Besprechung haben", "an einer Besprechung teilnehmen"], "Meeting も通じますが、職場では Besprechung が一般的です。", ["die Sitzung", "der Termin"])
  ],
  A2: [
    card("a2-001", "unterwegs", "unterwegs", "word", "adverb", "移動中で、出先で", "Ich bin noch unterwegs und komme zehn Minuten später.", "まだ移動中で、10分遅れて着きます。", ["daily", "work"], { usage: "場所・状態を表す副詞。sein と組み合わせる。" }, ["noch unterwegs sein", "unterwegs anrufen"], "移動中であることを簡潔に伝える便利な表現です。", ["ankommen", "sich verspäten"]),
    card("a2-002", "sich beeilen", "sich beeilen", "phrase", "verb", "急ぐ", "Wir müssen uns beeilen, sonst verpassen wir den Bus.", "急がないとバスに乗り遅れます。", ["daily"], { third_person: "beeilt sich", past_participle: "beeilt", auxiliary: "haben", separable: false, reflexive: true, government: "sich (Akkusativ) beeilen" }, ["sich ein bisschen beeilen", "Bitte beeilen Sie sich."], "再帰代名詞を忘れないでください。命令形でも Beeilen Sie sich! です。", ["eilig", "zu spät"]),
    card("a2-003", "Bescheid sagen", "Bescheid sagen", "collocation", "phrase", "知らせる", "Bitte sagen Sie mir Bescheid, wenn der Termin feststeht.", "予約日時が決まったら知らせてください。", ["daily", "work", "administration"], { usage: "jemandem (Dativ) Bescheid sagen; Bescheid はこの表現では無冠詞。" }, ["rechtzeitig Bescheid sagen", "jemandem kurz Bescheid geben"], "相手は3格です。mir/dir/ihm Bescheid sagen の形で覚えます。", ["informieren", "die Nachricht"]),
    card("a2-004", "sich kümmern", "sich um etwas kümmern", "phrase", "verb", "〜に対応する、世話をする", "Die Hausverwaltung kümmert sich um die Reparatur.", "管理会社が修理に対応します。", ["daily", "housing", "work"], { third_person: "kümmert sich", past_participle: "gekümmert", auxiliary: "haben", separable: false, reflexive: true, government: "um + Akkusativ" }, ["sich um ein Problem kümmern", "sich darum kümmern"], "対象には必ず um + 4格を使います。", ["erledigen", "betreuen"]),
    card("a2-005", "erledigen", "erledigen", "word", "verb", "済ませる、処理する", "Ich erledige den Antrag noch heute.", "申請は今日中に済ませます。", ["daily", "administration", "work"], { third_person: "erledigt", past_participle: "erledigt", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ" }, ["eine Aufgabe erledigen", "etwas schnell erledigen"], "用事や作業を完了する意味で広く使えます。", ["abschließen", "bearbeiten"]),
    card("a2-006", "ausfallen", "ausfallen", "word", "verb", "中止になる、運休する", "Der Zug fällt heute aus.", "その列車は今日運休です。", ["daily", "work"], { third_person: "fällt aus", past_participle: "ausgefallen", auxiliary: "sein", separable: true, reflexive: false, government: "自動詞" }, ["ein Termin fällt aus", "wegen Krankheit ausfallen"], "予定・交通・授業が中止になるときに使う自動詞です。完了形は sein。", ["absagen", "stattfinden"]),
    card("a2-007", "umtauschen", "umtauschen", "word", "verb", "交換する", "Kann ich den Pullover gegen eine andere Größe umtauschen?", "このセーターを別のサイズに交換できますか。", ["shopping"], { third_person: "tauscht um", past_participle: "umgetauscht", auxiliary: "haben", separable: true, reflexive: false, government: "Akkusativ; gegen + Akkusativ" }, ["Ware umtauschen", "gegen etwas umtauschen"], "返品して返金を受ける zurückgeben と、品物を交換する umtauschen を区別します。", ["zurückgeben", "reklamieren"]),
    card("a2-008", "reklamieren", "reklamieren", "word", "verb", "商品・サービスの不具合を申し立てる", "Ich möchte diesen Artikel reklamieren.", "この商品について不具合を申し立てたいです。", ["shopping"], { third_person: "reklamiert", past_participle: "reklamiert", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ" }, ["einen Artikel reklamieren", "einen Mangel reklamieren"], "単なる返品ではなく、不具合や誤りを理由に申し立てるときの語です。", ["die Reklamation", "beanstanden"]),
    card("a2-009", "beschädigt", "beschädigt", "word", "adjective", "破損した", "Die Verpackung war schon bei der Lieferung beschädigt.", "配送時点ですでに包装が破損していました。", ["shopping", "housing"], { usage: "動詞 beschädigen の過去分詞由来の形容詞。sein と使える。" }, ["stark beschädigt", "beschädigte Ware"], "壊れて機能しない defekt と、外観などが傷んだ beschädigt を使い分けます。", ["defekt", "der Schaden"]),
    card("a2-010", "Sonderangebot", "das Sonderangebot", "word", "noun", "特売品、特別価格", "Das Sonderangebot gilt nur bis Samstag.", "この特売は土曜日までです。", ["shopping"], { article: "das", plural: "Sonderangebote" }, ["im Sonderangebot", "ein günstiges Sonderangebot"], "im Sonderangebot sein で『特売になっている』と言えます。", ["der Rabatt", "der Preis"]),
    card("a2-011", "vorrätig", "vorrätig", "word", "adjective", "在庫がある", "Ist dieses Modell noch vorrätig?", "このモデルはまだ在庫がありますか。", ["shopping"], { usage: "主に sein と使う。否定は nicht vorrätig。" }, ["noch vorrätig", "nicht mehr vorrätig"], "店頭や薬局の在庫確認でよく使います。", ["auf Lager", "bestellen"]),
    card("a2-012", "Pfandbon", "der Pfandbon", "word", "noun", "返却した容器の預かり金引換券", "Vergessen Sie nicht, den Pfandbon an der Kasse einzulösen.", "レジでPfandの引換券を使うのを忘れないでください。", ["shopping"], { article: "der", plural: "Pfandbons" }, ["einen Pfandbon bekommen", "den Pfandbon einlösen"], "返却機から出る券はレジで支払いに充当できます。", ["das Pfand", "der Pfandautomat"]),
    card("a2-013", "zurückerstatten", "zurückerstatten", "word", "verb", "返金する", "Der Betrag wird auf Ihre Karte zurückerstattet.", "金額はカードへ返金されます。", ["shopping"], { third_person: "erstattet zurück", past_participle: "zurückerstattet", auxiliary: "haben", separable: true, reflexive: false, government: "jemandem (Dativ) etwas (Akkusativ)" }, ["den Kaufpreis zurückerstatten", "vollständig zurückerstatten"], "受け手は3格、返す金額は4格です。受動文でもよく見ます。", ["die Erstattung", "zurückzahlen"]),
    card("a2-014", "Aufenthaltserlaubnis", "die Aufenthaltserlaubnis", "word", "noun", "滞在許可", "Meine Aufenthaltserlaubnis ist noch bis Oktober gültig.", "私の滞在許可は10月まで有効です。", ["administration"], { article: "die", plural: "Aufenthaltserlaubnisse" }, ["eine Aufenthaltserlaubnis beantragen", "die Aufenthaltserlaubnis verlängern"], "日常的な総称 Aufenthaltstitel と、具体的な許可種別 Aufenthaltserlaubnis を区別します。", ["der Aufenthaltstitel", "gültig"]),
    card("a2-015", "verlängern", "verlängern", "word", "verb", "延長する、更新する", "Ich möchte meinen Aufenthaltstitel verlängern.", "滞在許可証を更新したいです。", ["administration"], { third_person: "verlängert", past_participle: "verlängert", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ" }, ["einen Vertrag verlängern", "eine Frist verlängern"], "許可・契約・期限など期間のあるものに使えます。", ["die Verlängerung", "erneuern"]),
    card("a2-016", "Unterlagen", "die Unterlagen", "word", "noun", "書類一式", "Welche Unterlagen muss ich mitbringen?", "どの書類を持参する必要がありますか。", ["administration", "work", "housing"], { article: "die", plural: "通常は複数形 Unterlagen" }, ["vollständige Unterlagen", "Unterlagen einreichen"], "複数の申請書類をまとめて指すため、通常は複数形です。", ["das Dokument", "der Nachweis"]),
    card("a2-017", "nachreichen", "nachreichen", "word", "verb", "後から提出する", "Den fehlenden Nachweis kann ich morgen nachreichen.", "不足している証明書は明日追加提出できます。", ["administration", "work"], { third_person: "reicht nach", past_participle: "nachgereicht", auxiliary: "haben", separable: true, reflexive: false, government: "Akkusativ" }, ["Unterlagen nachreichen", "per E-Mail nachreichen"], "すでに一部を提出し、不足分を後日追加するときに使います。", ["einreichen", "fehlen"]),
    card("a2-018", "zuständig", "zuständig", "word", "adjective", "担当である、管轄である", "Welche Stelle ist für meinen Antrag zuständig?", "私の申請はどの窓口が担当ですか。", ["administration", "work"], { usage: "für + Akkusativ zuständig sein" }, ["dafür zuständig sein", "die zuständige Stelle"], "対象には für + 4格を使います。", ["die Zuständigkeit", "verantwortlich"]),
    card("a2-019", "beantragen", "beantragen", "word", "verb", "申請する", "Sie können die Bescheinigung online beantragen.", "証明書はオンラインで申請できます。", ["administration"], { third_person: "beantragt", past_participle: "beantragt", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ" }, ["eine Erlaubnis beantragen", "schriftlich beantragen"], "antragen ではなく、非分離の beantragen として覚えます。", ["der Antrag", "einreichen"]),
    card("a2-020", "Meldebescheinigung", "die Meldebescheinigung", "word", "noun", "住民登録証明書", "Für die Bank brauche ich eine aktuelle Meldebescheinigung.", "銀行手続きには最新の住民登録証明書が必要です。", ["administration"], { article: "die", plural: "Meldebescheinigungen" }, ["eine Meldebescheinigung vorlegen", "eine aktuelle Meldebescheinigung"], "Anmeldung の完了を示す書類の名称です。", ["die Anmeldung", "die Bescheinigung"]),
    card("a2-021", "Bürgeramt", "das Bürgeramt", "word", "noun", "市民局、市民窓口", "Beim Bürgeramt gibt es Termine nur nach Vereinbarung.", "市民局は予約制です。", ["administration"], { article: "das", plural: "Bürgerämter" }, ["beim Bürgeramt", "einen Termin beim Bürgeramt"], "自治体により Bürgerbüro など別の名称もあります。", ["das Bürgerbüro", "die Behörde"]),
    card("a2-022", "vereinbaren", "vereinbaren", "word", "verb", "取り決める、予約する", "Wir haben einen neuen Termin vereinbart.", "新しい日時を取り決めました。", ["administration", "medical", "work"], { third_person: "vereinbart", past_participle: "vereinbart", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ; mit + Dativ" }, ["einen Termin vereinbaren", "schriftlich vereinbaren"], "予約だけでなく、条件や手順を合意する意味でも使います。", ["absprechen", "der Termin"]),
    card("a2-023", "Untersuchung", "die Untersuchung", "word", "noun", "検査、診察", "Vor der Untersuchung dürfen Sie nichts essen.", "検査前は何も食べてはいけません。", ["medical"], { article: "die", plural: "Untersuchungen" }, ["eine Untersuchung durchführen", "zur Untersuchung kommen"], "医師による診察にも具体的な検査にも使える語です。", ["untersuchen", "der Befund"]),
    card("a2-024", "verschreiben", "verschreiben", "word", "verb", "処方する", "Die Ärztin hat mir ein Antibiotikum verschrieben.", "医師が私に抗生物質を処方しました。", ["medical"], { third_person: "verschreibt", past_participle: "verschrieben", auxiliary: "haben", separable: false, reflexive: false, government: "jemandem (Dativ) etwas (Akkusativ)" }, ["ein Medikament verschreiben", "auf Rezept verschreiben"], "処方される人は3格、薬は4格です。", ["das Rezept", "verordnen"]),
    card("a2-025", "Nebenwirkung", "die Nebenwirkung", "word", "noun", "副作用", "Kann dieses Medikament Nebenwirkungen haben?", "この薬には副作用がありますか。", ["medical"], { article: "die", plural: "Nebenwirkungen" }, ["mögliche Nebenwirkungen", "Nebenwirkungen bemerken"], "多くの場合、複数形 Nebenwirkungen で尋ねます。", ["die Wirkung", "die Wechselwirkung"]),
    card("a2-026", "nüchtern", "nüchtern", "word", "adjective", "空腹の、飲食していない", "Muss ich zur Blutabnahme nüchtern kommen?", "採血には空腹で来る必要がありますか。", ["medical"], { usage: "医療では『飲食していない状態』。一般語では『冷静な』の意味もある。" }, ["nüchtern bleiben", "nüchtern zur Untersuchung kommen"], "検査ごとに水や薬の扱いが異なるため、具体的に確認します。", ["die Blutabnahme", "essen"]),
    card("a2-027", "überweisen", "überweisen", "word", "verb", "紹介する、振り込む", "Der Hausarzt überweist mich zum Orthopäden.", "かかりつけ医が整形外科へ紹介してくれます。", ["medical"], { third_person: "überweist", past_participle: "überwiesen", auxiliary: "haben", separable: false, reflexive: false, government: "jemanden (Akkusativ) zu + Dativ" }, ["zum Facharzt überweisen", "Geld überweisen"], "医療では専門医への紹介、銀行では送金という意味です。", ["die Überweisung", "der Facharzt"]),
    card("a2-028", "Krankschreibung", "die Krankschreibung", "word", "noun", "病欠証明、就労不能の証明", "Ich brauche eine Krankschreibung für meinen Arbeitgeber.", "勤務先に出す病欠証明が必要です。", ["medical", "work"], { article: "die", plural: "Krankschreibungen" }, ["eine Krankschreibung bekommen", "jemanden krankschreiben"], "正式書類名は Arbeitsunfähigkeitsbescheinigung です。", ["die Arbeitsunfähigkeitsbescheinigung", "sich krankmelden"]),
    card("a2-029", "Versicherungskarte", "die Versicherungskarte", "word", "noun", "保険証", "Bitte bringen Sie Ihre Versicherungskarte mit.", "保険証を持参してください。", ["medical"], { article: "die", plural: "Versicherungskarten" }, ["die Versicherungskarte einlesen", "die Karte mitbringen"], "公的健康保険の電子カードは Gesundheitskarte とも呼ばれます。", ["die Gesundheitskarte", "die Krankenversicherung"]),
    card("a2-030", "vertragen", "vertragen", "word", "verb", "（薬・食べ物などが）体に合う、耐える", "Ich vertrage dieses Medikament nicht gut.", "この薬は私にはあまり合いません。", ["medical"], { third_person: "verträgt", past_participle: "vertragen", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ" }, ["ein Medikament gut vertragen", "etwas nicht vertragen"], "アレルギーと断定せず、体に合わない感覚を伝えるときにも使えます。", ["die Unverträglichkeit", "allergisch"]),
    card("a2-031", "Nebenkosten", "die Nebenkosten", "word", "noun", "共益費・付帯費用", "Sind die Heizkosten in den Nebenkosten enthalten?", "暖房費は共益費に含まれていますか。", ["housing"], { article: "die", plural: "複数形のみ" }, ["Nebenkosten zahlen", "in den Nebenkosten enthalten"], "Kaltmiete に加えて支払う費用の総称です。含まれる項目を確認します。", ["die Warmmiete", "die Heizkosten"]),
    card("a2-032", "Hausordnung", "die Hausordnung", "word", "noun", "建物の利用規則", "Laut Hausordnung ist Ruhezeit ab 22 Uhr.", "建物規則では22時から静粛時間です。", ["housing"], { article: "die", plural: "Hausordnungen" }, ["die Hausordnung beachten", "laut Hausordnung"], "集合住宅の騒音・共用部・ごみなどの規則をまとめたものです。", ["die Ruhezeit", "das Treppenhaus"]),
    card("a2-033", "kündigen", "kündigen", "word", "verb", "解約する、退職を申し出る", "Wir möchten den Mietvertrag zum Monatsende kündigen.", "月末で賃貸契約を解約したいです。", ["housing", "work"], { third_person: "kündigt", past_participle: "gekündigt", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ; jemandem (Dativ) kündigen" }, ["einen Vertrag kündigen", "fristgerecht kündigen"], "契約を解約する場合は4格、雇用関係で人に解雇を通知する場合は3格も使います。", ["die Kündigung", "die Kündigungsfrist"]),
    card("a2-034", "einziehen", "einziehen", "word", "verb", "入居する", "Wir sind am ersten Juli eingezogen.", "私たちは7月1日に入居しました。", ["housing"], { third_person: "zieht ein", past_participle: "eingezogen", auxiliary: "sein", separable: true, reflexive: false, government: "in + Akkusativ" }, ["in eine Wohnung einziehen", "neu einziehen"], "場所の移動を表すこの意味の完了形は sein を使います。", ["ausziehen", "der Einzug"]),
    card("a2-035", "ausziehen", "ausziehen", "word", "verb", "退去する、引っ越し出る", "Wir ziehen Ende September aus.", "9月末に退去します。", ["housing"], { third_person: "zieht aus", past_participle: "ausgezogen", auxiliary: "sein", separable: true, reflexive: false, government: "aus + Dativ" }, ["aus der Wohnung ausziehen", "zum Monatsende ausziehen"], "衣服を脱がせる意味では目的語を取り、完了形に haben を使う場合があります。", ["einziehen", "der Auszug"]),
    card("a2-036", "Mangel", "der Mangel", "word", "noun", "欠陥、不具合", "Im Badezimmer gibt es einen Mangel.", "浴室に不具合があります。", ["housing", "shopping"], { article: "der", plural: "Mängel" }, ["einen Mangel melden", "ein erheblicher Mangel"], "不足の意味もありますが、住居や商品の欠陥を表す法律・実務語としてよく使います。", ["der Schaden", "defekt"]),
    card("a2-037", "Besichtigung", "die Besichtigung", "word", "noun", "内見、見学", "Können wir einen Termin zur Besichtigung vereinbaren?", "内見の予約を取れますか。", ["housing"], { article: "die", plural: "Besichtigungen" }, ["eine Wohnung besichtigen", "ein Besichtigungstermin"], "物件の内見は Wohnungsbesichtigung とも言います。", ["besichtigen", "der Besichtigungstermin"]),
    card("a2-038", "Kaution", "die Kaution", "word", "noun", "敷金、保証金", "Die Kaution beträgt drei Kaltmieten.", "敷金は冷家賃3か月分です。", ["housing"], { article: "die", plural: "Kautionen" }, ["eine Kaution zahlen", "die Kaution zurückzahlen"], "金額の説明では betragen をよく使います。", ["die Mietkaution", "die Kaltmiete"]),
    card("a2-039", "Hausmeister", "der Hausmeister", "word", "noun", "管理人", "Der Hausmeister schaut sich die Heizung morgen an.", "管理人が明日暖房を確認します。", ["housing"], { article: "der", plural: "Hausmeister" }, ["den Hausmeister anrufen", "der zuständige Hausmeister"], "管理人がすべての修理責任を持つとは限らないため、まず担当範囲を確認します。", ["die Hausmeisterin", "die Hausverwaltung"]),
    card("a2-040", "Eingewöhnung", "die Eingewöhnung", "word", "noun", "慣らし保育、適応期間", "Die Eingewöhnung dauert voraussichtlich drei Wochen.", "慣らし保育は見込みで3週間かかります。", ["kita-school"], { article: "die", plural: "Eingewöhnungen" }, ["mit der Eingewöhnung beginnen", "eine behutsame Eingewöhnung"], "Kitaに慣れる過程を指す実務的な語です。", ["sich eingewöhnen", "die Bezugsperson"]),
    card("a2-041", "Elternabend", "der Elternabend", "word", "noun", "保護者会", "Der nächste Elternabend findet online statt.", "次の保護者会はオンラインで行われます。", ["kita-school"], { article: "der", plural: "Elternabende" }, ["am Elternabend teilnehmen", "zum Elternabend kommen"], "Kitaと学校のどちらでも使います。", ["die Eltern", "stattfinden"]),
    card("a2-042", "abmelden", "abmelden", "word", "verb", "欠席連絡をする、登録を解除する", "Bitte melden Sie Ihr Kind vor acht Uhr ab.", "8時までに子どもの欠席連絡をしてください。", ["kita-school", "administration"], { third_person: "meldet ab", past_participle: "abgemeldet", auxiliary: "haben", separable: true, reflexive: false, government: "jemanden/etwas (Akkusativ) abmelden; sich abmelden" }, ["ein Kind abmelden", "sich beim Bürgeramt abmelden"], "対象を登録解除する形と、自分が登録解除する再帰形があります。", ["anmelden", "die Abmeldung"]),
    card("a2-043", "Vertretung", "die Vertretung", "word", "noun", "代理、代行者", "Heute übernimmt eine Vertretung die Gruppe.", "今日は代理の先生がグループを担当します。", ["kita-school", "work"], { article: "die", plural: "Vertretungen" }, ["eine Vertretung organisieren", "die Vertretung übernehmen"], "人そのものにも代理という仕組みにも使います。", ["vertreten", "der Ersatz"]),
    card("a2-044", "abholen lassen", "jemanden abholen lassen", "collocation", "phrase", "誰かに迎えに行ってもらう", "Heute lasse ich mein Kind von meiner Schwester abholen.", "今日は姉（妹）に子どもを迎えに行ってもらいます。", ["kita-school"], { usage: "lassen + Akkusativ + 不定詞。実行者は von + Dativ で示せる。" }, ["ein Kind abholen lassen", "von einer Person abholen lassen"], "迎えに行く人をKitaへ事前登録する必要がある場合があります。", ["abholen", "die Abholberechtigung"]),
    card("a2-045", "Rückmeldung", "die Rückmeldung", "word", "noun", "返答、フィードバック", "Vielen Dank für Ihre schnelle Rückmeldung.", "早速のご返信ありがとうございます。", ["work", "administration"], { article: "die", plural: "Rückmeldungen" }, ["eine Rückmeldung geben", "auf Rückmeldung warten"], "メールの返信にも、内容へのフィードバックにも使えます。", ["antworten", "das Feedback"]),
    card("a2-046", "Schicht", "die Schicht", "word", "noun", "勤務シフト、交代勤務", "Meine Schicht beginnt heute um sechs Uhr.", "今日のシフトは6時に始まります。", ["work"], { article: "die", plural: "Schichten" }, ["eine Schicht übernehmen", "in Schichten arbeiten"], "早番 Frühschicht、遅番 Spätschicht、夜勤 Nachtschicht と組み合わせます。", ["der Dienstplan", "die Arbeitszeit"]),
    card("a2-047", "sich verspäten", "sich verspäten", "phrase", "verb", "遅れる", "Ich verspäte mich wegen einer Zugstörung um etwa 15 Minuten.", "列車のトラブルで15分ほど遅れます。", ["work", "daily"], { third_person: "verspätet sich", past_participle: "verspätet", auxiliary: "haben", separable: false, reflexive: true, government: "um + 時間 / wegen + Genitiv または口語 Dativ" }, ["sich um zehn Minuten verspäten", "sich leider verspäten"], "遅れる時間は um、理由は wegen で伝えます。", ["die Verspätung", "zu spät kommen"]),
    card("a2-048", "anhängen", "eine Datei anhängen", "collocation", "verb", "ファイルを添付する", "Ich habe die Rechnung als PDF angehängt.", "請求書をPDFで添付しました。", ["work", "administration"], { third_person: "hängt an", past_participle: "angehängt", auxiliary: "haben", separable: true, reflexive: false, government: "Akkusativ; als + 形式" }, ["eine Datei anhängen", "im Anhang finden"], "メール本文では Im Anhang finden Sie ... も定番です。", ["der Anhang", "beifügen"]),
    card("a2-049", "erreichbar", "erreichbar", "word", "adjective", "連絡がつく、到達できる", "Ich bin heute Nachmittag telefonisch erreichbar.", "今日の午後は電話で連絡がつきます。", ["work", "daily"], { usage: "sein と使い、手段は telefonisch/per E-Mail などで示す。" }, ["telefonisch erreichbar", "gut erreichbar"], "人への連絡と場所へのアクセスの両方に使えます。", ["kontaktieren", "verfügbar"]),
    card("a2-050", "Urlaub beantragen", "Urlaub beantragen", "collocation", "phrase", "休暇を申請する", "Ich möchte für die erste Septemberwoche Urlaub beantragen.", "9月第1週の休暇を申請したいです。", ["work"], { usage: "Urlaub は通常無冠詞。beantragen は Akkusativ を取る。" }, ["bezahlten Urlaub beantragen", "einen Urlaubstag beantragen"], "休暇は申請後の承認が必要なため、nehmen ではなくまず beantragen を使います。", ["der Urlaubsantrag", "Urlaub nehmen"])
  ],
  B1: [
    card("b1-001", "sich gewöhnen", "sich an etwas gewöhnen", "phrase", "verb", "〜に慣れる", "Ich habe mich inzwischen an die langen Öffnungszeiten gewöhnt.", "今では長い営業時間に慣れました。", ["daily", "work"], { third_person: "gewöhnt sich", past_participle: "gewöhnt", auxiliary: "haben", separable: false, reflexive: true, government: "an + Akkusativ" }, ["sich langsam an etwas gewöhnen", "daran gewöhnt sein"], "対象には an + 4格を使います。状態を表すときは an etwas gewöhnt sein。", ["ungewohnt", "die Gewohnheit"]),
    card("b1-002", "nachvollziehen", "nachvollziehen", "word", "verb", "筋道を追って理解する、納得する", "Ich kann Ihre Entscheidung nachvollziehen, brauche aber noch eine Begründung.", "ご判断は理解できますが、もう少し理由が必要です。", ["daily", "administration", "work"], { third_person: "vollzieht nach", past_participle: "nachvollzogen", auxiliary: "haben", separable: true, reflexive: false, government: "Akkusativ" }, ["eine Entscheidung nachvollziehen", "gut nachvollziehbar"], "単に verstehen より、理由や過程を追って理解する含みがあります。", ["verstehen", "nachvollziehbar"]),
    card("b1-003", "zur Verfügung stehen", "zur Verfügung stehen", "collocation", "phrase", "利用できる、対応可能である", "Für Rückfragen stehe ich Ihnen gern zur Verfügung.", "ご質問があれば喜んで対応いたします。", ["daily", "work", "administration"], { usage: "jemandem (Dativ) zur Verfügung stehen。主語は人・物・時間など。" }, ["jederzeit zur Verfügung stehen", "nicht zur Verfügung stehen"], "メールの結びでよく使われる丁寧な定型表現です。", ["verfügbar", "erreichbar"]),
    card("b1-004", "in Anspruch nehmen", "etwas in Anspruch nehmen", "collocation", "phrase", "サービス・権利などを利用する", "Sie können die kostenlose Beratung in Anspruch nehmen.", "無料相談を利用できます。", ["daily", "administration", "medical"], { usage: "Akkusativ + in Anspruch nehmen。分離せず一まとまりで使う。" }, ["eine Leistung in Anspruch nehmen", "Hilfe in Anspruch nehmen"], "時間がかかるという別の意味（Das nimmt Zeit in Anspruch）もあります。", ["nutzen", "die Leistung"]),
    card("b1-005", "vorläufig", "vorläufig", "word", "adjective", "暫定的な、当面の", "Sie erhalten zunächst eine vorläufige Bescheinigung.", "まず暫定証明書を受け取ります。", ["daily", "administration"], { usage: "形容詞・副詞。確定前の一時的な状態を表す。" }, ["vorläufig gültig", "eine vorläufige Entscheidung"], "『一時的』でも Zeitraum より、正式決定前という含みが強い語です。", ["endgültig", "vorübergehend"]),
    card("b1-006", "sich ergeben", "sich ergeben", "phrase", "verb", "結果として生じる、判明する", "Aus der Abrechnung ergibt sich eine Nachzahlung.", "精算の結果、追加支払いが発生します。", ["daily", "housing", "work"], { third_person: "ergibt sich", past_participle: "ergeben", auxiliary: "haben", separable: false, reflexive: true, government: "aus + Dativ" }, ["daraus ergibt sich", "sich aus den Unterlagen ergeben"], "書類や状況から自然に結論が出る場面で使います。", ["folgen", "das Ergebnis"]),
    card("b1-007", "zuverlässig", "zuverlässig", "word", "adjective", "信頼できる、確実な", "Der Hausmeister reagiert normalerweise sehr zuverlässig.", "管理人は普段とても確実に対応します。", ["daily", "housing", "work"], { usage: "人・物・仕組みについて使える。名詞は Zuverlässigkeit。" }, ["zuverlässig arbeiten", "eine zuverlässige Person"], "時間を守るだけでなく、約束どおり確実に行うという意味です。", ["pünktlich", "verlässlich"]),
    card("b1-008", "Voraussetzung", "die Voraussetzung", "word", "noun", "前提条件、要件", "Eine Anmeldung ist Voraussetzung für den Antrag.", "住民登録がその申請の要件です。", ["administration", "work"], { article: "die", plural: "Voraussetzungen" }, ["eine Voraussetzung erfüllen", "unter bestimmten Voraussetzungen"], "要件を満たすは eine Voraussetzung erfüllen と言います。", ["die Bedingung", "erfüllen"]),
    card("b1-009", "Gewährleistung", "die Gewährleistung", "word", "noun", "法定の契約不適合責任・保証", "Für den Mangel gilt die gesetzliche Gewährleistung.", "その不具合には法定の契約不適合責任が適用されます。", ["shopping"], { article: "die", plural: "Gewährleistungen" }, ["gesetzliche Gewährleistung", "Ansprüche aus Gewährleistung"], "任意のメーカー保証 Garantie と、販売者の法的責任 Gewährleistung は別です。", ["die Garantie", "der Mangel"]),
    card("b1-010", "Erstattung", "die Erstattung", "word", "noun", "返金、払い戻し", "Die Erstattung erfolgt innerhalb von fünf Werktagen.", "返金は5営業日以内に行われます。", ["shopping", "medical"], { article: "die", plural: "Erstattungen" }, ["eine Erstattung beantragen", "vollständige Erstattung"], "商品代金だけでなく、医療費や交通費の払い戻しにも使います。", ["zurückerstatten", "die Rückzahlung"]),
    card("b1-011", "Lieferverzögerung", "die Lieferverzögerung", "word", "noun", "配送遅延", "Wegen einer Lieferverzögerung kommt das Paket erst nächste Woche.", "配送遅延のため荷物は来週届きます。", ["shopping"], { article: "die", plural: "Lieferverzögerungen" }, ["über eine Lieferverzögerung informieren", "erhebliche Lieferverzögerung"], "遅れの理由を示すときは wegen、到着予定は voraussichtlich と組み合わせます。", ["die Lieferung", "die Verspätung"]),
    card("b1-012", "widerrufen", "widerrufen", "word", "verb", "撤回する、（契約を）取消す", "Ich möchte den Onlinevertrag fristgerecht widerrufen.", "オンライン契約を期限内に撤回したいです。", ["shopping"], { third_person: "widerruft", past_participle: "widerrufen", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ" }, ["einen Vertrag widerrufen", "schriftlich widerrufen"], "kündigen は将来に向けた解約、widerrufen は成立した意思表示の撤回です。", ["der Widerruf", "kündigen"]),
    card("b1-013", "beanstanden", "beanstanden", "word", "verb", "問題点を正式に指摘する", "Ich möchte die falsche Rechnung beanstanden.", "誤った請求書について異議を申し立てたいです。", ["shopping", "housing"], { third_person: "beanstandet", past_participle: "beanstandet", auxiliary: "haben", separable: false, reflexive: false, government: "Akkusativ" }, ["eine Rechnung beanstanden", "einen Mangel beanstanden"], "reklamieren より書面や業務で使われやすい表現です。", ["reklamieren", "bemängeln"]),
    card("b1-014", "Kulanz", "die Kulanz", "word", "noun", "任意の配慮、好意的対応", "Das Geschäft nimmt den Artikel aus Kulanz zurück.", "店は任意の配慮でその商品を返品扱いにします。", ["shopping"], { article: "die", plural: "通常は単数形" }, ["aus Kulanz", "eine Kulanzlösung anbieten"], "法的義務ではなく、事業者が任意で対応する場合に使います。", ["entgegenkommen", "die Gewährleistung"]),
    card("b1-015", "Ersatzlieferung", "die Ersatzlieferung", "word", "noun", "代替品の配送", "Wir schicken Ihnen kostenlos eine Ersatzlieferung.", "代替品を無料でお送りします。", ["shopping"], { article: "die", plural: "Ersatzlieferungen" }, ["eine Ersatzlieferung veranlassen", "kostenlose Ersatzlieferung"], "不良品の代替品を送る場面で使います。", ["der Ersatz", "nachliefern"]),
    card("b1-016", "Bearbeitungsstand", "der Bearbeitungsstand", "word", "noun", "処理状況、審査の進捗", "Ich möchte mich nach dem Bearbeitungsstand meines Antrags erkundigen.", "申請の処理状況を伺いたいです。", ["administration"], { article: "der", plural: "Bearbeitungsstände" }, ["den Bearbeitungsstand erfragen", "sich nach dem Bearbeitungsstand erkundigen"], "Sachstand よりも、実際の処理進捗を直接示す語です。", ["der Sachstand", "bearbeiten"]),
    card("b1-017", "Frist", "die Frist", "word", "noun", "期限", "Die Frist endet am 15. September.", "期限は9月15日に終了します。", ["administration", "housing", "work"], { article: "die", plural: "Fristen" }, ["eine Frist einhalten", "die Frist verlängern"], "Termin は日時、Frist は何かを完了すべき期限です。", ["die Fristverlängerung", "fristgerecht"]),
    card("b1-018", "Widerspruch", "der Widerspruch", "word", "noun", "異議申立て、矛盾", "Gegen den Bescheid können Sie Widerspruch einlegen.", "その決定通知に対して異議申立てができます。", ["administration"], { article: "der", plural: "Widersprüche" }, ["Widerspruch einlegen", "einem Widerspruch stattgeben"], "行政文脈では gegen + 4格と einlegen の組合せを使います。", ["der Bescheid", "die Rechtsbehelfsbelehrung"]),
    card("b1-019", "Bescheid", "der Bescheid", "word", "noun", "行政機関などの決定通知", "Den schriftlichen Bescheid erhalten Sie per Post.", "書面の決定通知は郵送で届きます。", ["administration"], { article: "der", plural: "Bescheide" }, ["einen Bescheid erhalten", "ein ablehnender Bescheid"], "Bescheid sagen の Bescheid と同じ形ですが、ここでは可算名詞の正式通知です。", ["der Antrag", "der Widerspruch"]),
    card("b1-020", "Aufenthaltstitel", "der Aufenthaltstitel", "word", "noun", "滞在資格・滞在許可証の総称", "Der Aufenthaltstitel enthält eine Nebenbestimmung zur Beschäftigung.", "滞在許可証には就労に関する付記事項があります。", ["administration", "work"], { article: "der", plural: "Aufenthaltstitel" }, ["einen Aufenthaltstitel besitzen", "den Aufenthaltstitel verlängern"], "滞在資格の総称として使われ、具体的な種類は Aufenthaltserlaubnis などです。", ["die Aufenthaltserlaubnis", "die Nebenbestimmung"]),
    card("b1-021", "vollständige Unterlagen", "vollständige Unterlagen", "collocation", "phrase", "不備のない書類一式", "Bitte prüfen Sie, ob meine Unterlagen vollständig sind.", "私の書類に不備がないか確認してください。", ["administration", "housing", "work"], { usage: "複数形 Unterlagen に形容詞 vollständig を付ける。定冠詞なしでは vollständige。" }, ["Unterlagen vollständig einreichen", "die Vollständigkeit prüfen"], "『全部提出した』と『審査上十分』は異なるため、確認を求めると安全です。", ["nachreichen", "die Vollständigkeit"]),
    card("b1-022", "zuständige Behörde", "die zuständige Behörde", "collocation", "phrase", "管轄当局", "Welche Behörde ist für meinen Wohnort zuständig?", "私の居住地を管轄するのはどの当局ですか。", ["administration"], { usage: "für + Akkusativ zuständig。形容詞は定冠詞後の語尾 -e。" }, ["bei der zuständigen Behörde", "die örtlich zuständige Behörde"], "自治体・居住地によって管轄が変わる場面で重要です。", ["die Zuständigkeit", "das Amt"]),
    card("b1-023", "Anspruch", "der Anspruch auf", "word", "noun", "〜を受ける権利、請求権", "Unter diesen Voraussetzungen haben Sie Anspruch auf Unterstützung.", "この条件では支援を受ける権利があります。", ["administration", "medical", "work"], { article: "der", plural: "Ansprüche", government: "auf + Akkusativ" }, ["Anspruch auf eine Leistung haben", "einen Anspruch geltend machen"], "対象には auf + 4格を使います。単なる希望ではなく権利性を示します。", ["die Leistung", "berechtigt"]),
    card("b1-024", "Nachweis", "der Nachweis", "word", "noun", "証明書、証拠", "Als Nachweis reicht eine Kopie des Mietvertrags aus.", "証明には賃貸契約書の写しで足ります。", ["administration", "housing", "work"], { article: "der", plural: "Nachweise" }, ["einen Nachweis vorlegen", "als Nachweis dienen"], "証明する内容により Dokument より具体的な機能を示す語です。", ["nachweisen", "die Bescheinigung"]),
    card("b1-025", "Beschwerden", "die Beschwerden", "word", "noun", "症状、不調", "Seit wann bestehen die Beschwerden?", "症状はいつから続いていますか。", ["medical"], { article: "die", plural: "医療では通常複数形 Beschwerden" }, ["akute Beschwerden", "Beschwerden lindern"], "苦情という意味もありますが、医療では症状の総称です。", ["das Symptom", "die Schmerzen"]),
    card("b1-026", "Diagnose", "die Diagnose", "word", "noun", "診断", "Für eine sichere Diagnose sind weitere Untersuchungen nötig.", "確実な診断には追加検査が必要です。", ["medical"], { article: "die", plural: "Diagnosen" }, ["eine Diagnose stellen", "eine Diagnose bestätigen"], "診断を下すは eine Diagnose stellen と言います。", ["diagnostizieren", "der Befund"]),
    card("b1-027", "Behandlung", "die Behandlung", "word", "noun", "治療、処置", "Die Behandlung dauert voraussichtlich sechs Wochen.", "治療は見込みで6週間続きます。", ["medical"], { article: "die", plural: "Behandlungen" }, ["eine Behandlung beginnen", "unter ärztlicher Behandlung"], "受診だけでなく、継続的な治療全体を指します。", ["behandeln", "die Therapie"]),
    card("b1-028", "Wechselwirkung", "die Wechselwirkung", "word", "noun", "相互作用", "Gibt es Wechselwirkungen mit meinen anderen Medikamenten?", "ほかの薬との相互作用はありますか。", ["medical"], { article: "die", plural: "Wechselwirkungen", government: "mit + Dativ" }, ["mögliche Wechselwirkungen", "Wechselwirkungen beachten"], "併用薬は mit + 3格で示します。", ["die Nebenwirkung", "die Einnahme"]),
    card("b1-029", "sich verschlimmern", "sich verschlimmern", "phrase", "verb", "悪化する", "Wenn sich die Beschwerden verschlimmern, kommen Sie bitte wieder.", "症状が悪化したら、もう一度来てください。", ["medical"], { third_person: "verschlimmert sich", past_participle: "verschlimmert", auxiliary: "haben", separable: false, reflexive: true, government: "sich (Akkusativ) verschlimmern" }, ["sich deutlich verschlimmern", "plötzlich schlimmer werden"], "主語は症状や状態で、再帰代名詞を伴います。", ["sich verbessern", "schlimmer werden"]),
    card("b1-030", "Arbeitsunfähigkeitsbescheinigung", "die Arbeitsunfähigkeitsbescheinigung", "word", "noun", "就労不能証明書", "Die Arbeitsunfähigkeitsbescheinigung wird elektronisch übermittelt.", "就労不能証明書は電子送信されます。", ["medical", "work"], { article: "die", plural: "Arbeitsunfähigkeitsbescheinigungen" }, ["eine Arbeitsunfähigkeitsbescheinigung erhalten", "elektronische AU"], "口語では Krankschreibung、略して AU とも呼ばれます。", ["die Krankschreibung", "arbeitsunfähig"]),
    card("b1-031", "Vorsorgeuntersuchung", "die Vorsorgeuntersuchung", "word", "noun", "予防検診", "Welche Vorsorgeuntersuchungen übernimmt die Krankenkasse?", "どの予防検診を健康保険が負担しますか。", ["medical"], { article: "die", plural: "Vorsorgeuntersuchungen" }, ["an einer Vorsorgeuntersuchung teilnehmen", "Kosten übernehmen"], "受診前に対象・間隔・費用負担を確認する場面で使います。", ["die Früherkennung", "die Krankenkasse"]),
    card("b1-032", "Befund", "der Befund", "word", "noun", "検査所見、結果", "Der Befund wird direkt an Ihre Hausärztin geschickt.", "検査所見はかかりつけ医へ直接送られます。", ["medical"], { article: "der", plural: "Befunde" }, ["einen Befund besprechen", "ein unauffälliger Befund"], "単なる数値結果 Ergebnis より、医療者がまとめた所見を指します。", ["das Ergebnis", "die Diagnose"]),
    card("b1-033", "Mietvertrag", "der Mietvertrag", "word", "noun", "賃貸契約書", "Lesen Sie den Mietvertrag vor der Unterschrift sorgfältig durch.", "署名前に賃貸契約書をよく読んでください。", ["housing"], { article: "der", plural: "Mietverträge" }, ["einen Mietvertrag unterschreiben", "den Mietvertrag kündigen"], "Vertrag を durchlesen は分離動詞で『最初から最後まで読む』という意味です。", ["der Vertrag", "die Kündigungsfrist"]),
    card("b1-034", "Betriebskostenabrechnung", "die Betriebskostenabrechnung", "word", "noun", "年間の共益費精算書", "Bitte erläutern Sie mir diese Position in der Betriebskostenabrechnung.", "共益費精算書のこの項目を説明してください。", ["housing"], { article: "die", plural: "Betriebskostenabrechnungen" }, ["die Abrechnung prüfen", "eine Nachzahlung aus der Abrechnung"], "毎月の前払い Nebenkosten と、年次精算 Abrechnung を区別します。", ["die Nebenkosten", "die Nachzahlung"]),
    card("b1-035", "Mieterhöhung", "die Mieterhöhung", "word", "noun", "家賃値上げ", "Wir haben eine schriftliche Mieterhöhung erhalten.", "書面で家賃値上げの通知を受けました。", ["housing"], { article: "die", plural: "Mieterhöhungen" }, ["eine Mieterhöhung begründen", "einer Mieterhöhung zustimmen"], "内容・根拠・適用時期を分けて確認すると明確です。", ["die Miete", "erhöhen"]),
    card("b1-036", "Übergabeprotokoll", "das Übergabeprotokoll", "word", "noun", "物件引渡し記録", "Alle vorhandenen Schäden sollten im Übergabeprotokoll stehen.", "既存の損傷はすべて引渡し記録に記載すべきです。", ["housing"], { article: "das", plural: "Übergabeprotokolle" }, ["ein Übergabeprotokoll erstellen", "im Protokoll festhalten"], "入居時・退去時の状態、メーター値、鍵を記録します。", ["die Wohnungsübergabe", "der Schaden"]),
    card("b1-037", "Hausverwaltung", "die Hausverwaltung", "word", "noun", "建物管理会社、管理部門", "Ich habe den Wasserschaden der Hausverwaltung gemeldet.", "水漏れ被害を管理会社に連絡しました。", ["housing"], { article: "die", plural: "Hausverwaltungen" }, ["die Hausverwaltung kontaktieren", "einen Schaden melden"], "melden の相手は3格なので der Hausverwaltung です。", ["der Vermieter", "der Hausmeister"]),
    card("b1-038", "fristgerecht", "fristgerecht", "word", "adjective", "期限どおりの、期限内に", "Die Kündigung muss fristgerecht eingehen.", "解約通知は期限内に到達する必要があります。", ["housing", "administration", "work"], { usage: "形容詞・副詞。期限を守ることを表す。" }, ["fristgerecht kündigen", "fristgerecht einreichen"], "送信日ではなく相手への到達日が問題になる文脈もあるため、動詞 eingegangen を確認します。", ["die Frist", "rechtzeitig"]),
    card("b1-039", "Mietminderung", "die Mietminderung", "word", "noun", "家賃減額", "Eine Mietminderung sollte nicht ohne rechtliche Prüfung erfolgen.", "家賃減額は法的確認なしに行うべきではありません。", ["housing"], { article: "die", plural: "Mietminderungen" }, ["eine Mietminderung prüfen", "zur Mietminderung berechtigen"], "不具合があっても自己判断で減額せず、専門家に確認する表現と一緒に覚えます。", ["der Mangel", "die Rechtsberatung"]),
    card("b1-040", "Instandhaltung", "die Instandhaltung", "word", "noun", "維持管理、保全", "Für die Instandhaltung des Gebäudes ist der Eigentümer zuständig.", "建物の維持管理は所有者の担当です。", ["housing"], { article: "die", plural: "通常は単数形" }, ["Kosten der Instandhaltung", "für Instandhaltung sorgen"], "修理 Reparatur より広く、状態を維持するための措置全体を指します。", ["die Reparatur", "instand halten"]),
    card("b1-041", "Förderbedarf", "der Förderbedarf", "word", "noun", "支援・教育上の必要性", "Im Gespräch klären wir, ob zusätzlicher Förderbedarf besteht.", "面談で追加支援の必要があるか確認します。", ["kita-school"], { article: "der", plural: "Förderbedarfe" }, ["Förderbedarf feststellen", "besonderer Förderbedarf"], "子どもの不足を責める語ではなく、必要な支援を整理する実務語です。", ["die Förderung", "unterstützen"]),
    card("b1-042", "Entwicklungsgespräch", "das Entwicklungsgespräch", "word", "noun", "発達・成長に関する面談", "Beim Entwicklungsgespräch sprechen wir über Sprache und Sozialverhalten.", "発達面談では言語と社会的行動について話します。", ["kita-school"], { article: "das", plural: "Entwicklungsgespräche" }, ["ein Entwicklungsgespräch führen", "zum Gespräch einladen"], "Kitaで定期的に行われる子どもの様子に関する面談です。", ["die Entwicklung", "das Elterngespräch"]),
    card("b1-043", "Schulpflicht", "die Schulpflicht", "word", "noun", "就学義務", "Die Schulpflicht beginnt je nach Bundesland zu einem bestimmten Stichtag.", "就学義務は州ごとに定められた基準日から始まります。", ["kita-school"], { article: "die", plural: "通常は単数形" }, ["der Schulpflicht unterliegen", "Beginn der Schulpflicht"], "教育制度は州ごとに異なるため、Bundesland と一緒に確認します。", ["schulpflichtig", "die Einschulung"]),
    card("b1-044", "Fehlzeit", "die Fehlzeit", "word", "noun", "欠席時間、欠勤期間", "Die Fehlzeit muss schriftlich entschuldigt werden.", "欠席について書面で理由を届ける必要があります。", ["kita-school", "work"], { article: "die", plural: "Fehlzeiten" }, ["Fehlzeiten dokumentieren", "unentschuldigte Fehlzeiten"], "fehlen という行為を記録上の期間として表す名詞です。", ["die Abwesenheit", "fehlen"]),
    card("b1-045", "Lernstand", "der Lernstand", "word", "noun", "学習到達状況", "Die Lehrerin informiert uns über den aktuellen Lernstand.", "先生が現在の学習状況を知らせてくれます。", ["kita-school"], { article: "der", plural: "Lernstände" }, ["den Lernstand einschätzen", "aktueller Lernstand"], "成績 Note だけでなく、現在できること全体を表します。", ["der Fortschritt", "die Leistung"]),
    card("b1-046", "Tagesordnung", "die Tagesordnung", "word", "noun", "会議の議題・進行表", "Ich würde gern noch einen Punkt auf die Tagesordnung setzen.", "議題をもう1つ追加したいです。", ["work"], { article: "die", plural: "Tagesordnungen" }, ["auf der Tagesordnung stehen", "einen Punkt aufnehmen"], "議題項目は Tagesordnungspunkt と言います。", ["der Tagesordnungspunkt", "die Besprechung"]),
    card("b1-047", "Protokoll", "das Protokoll", "word", "noun", "議事録、記録", "Im Protokoll sind die nächsten Schritte festgehalten.", "議事録に次の手順が記録されています。", ["work", "housing"], { article: "das", plural: "Protokolle" }, ["Protokoll führen", "im Protokoll festhalten"], "会議記録にも、引渡し・検査記録にも使います。", ["protokollieren", "die Zusammenfassung"]),
    card("b1-048", "Rücksprache halten", "mit jemandem Rücksprache halten", "collocation", "phrase", "〜に確認・相談する", "Ich muss dazu noch Rücksprache mit meiner Vorgesetzten halten.", "その件は上司にもう一度確認する必要があります。", ["work", "administration"], { usage: "mit + Dativ Rücksprache halten。Rücksprache は通常無冠詞。" }, ["intern Rücksprache halten", "nach Rücksprache mit"], "自分だけで決めず、権限者や関係者に確認する含みがあります。", ["sich abstimmen", "nachfragen"]),
    card("b1-049", "sich abstimmen", "sich mit jemandem abstimmen", "phrase", "verb", "関係者と調整する", "Wir stimmen uns mit der IT-Abteilung über den Termin ab.", "IT部門と日程について調整します。", ["work"], { third_person: "stimmt sich ab", past_participle: "abgestimmt", auxiliary: "haben", separable: true, reflexive: true, government: "mit + Dativ; über + Akkusativ" }, ["sich eng abstimmen", "etwas aufeinander abstimmen"], "人との調整は再帰形、物同士を整合させる場合は etwas aufeinander abstimmen。", ["koordinieren", "Rücksprache halten"]),
    card("b1-050", "sich einarbeiten", "sich in etwas einarbeiten", "phrase", "verb", "仕事・分野に慣れ習熟する", "Ich arbeite mich gerade in das neue System ein.", "今、新しいシステムを習得しているところです。", ["work"], { third_person: "arbeitet sich ein", past_participle: "eingearbeitet", auxiliary: "haben", separable: true, reflexive: true, government: "in + Akkusativ" }, ["sich gründlich einarbeiten", "jemanden einarbeiten"], "自分が習得する場合は再帰形、誰かを研修する場合は jemanden einarbeiten。", ["die Einarbeitung", "sich gewöhnen"])
  ],
  B2: [
    card("b2-001", "in die Wege leiten", "etwas in die Wege leiten", "collocation", "phrase", "手続きを開始する、実行に移す", "Wir haben die erforderlichen Reparaturen bereits in die Wege geleitet.", "必要な修理はすでに手配を開始しました。", ["daily", "housing", "work"], { usage: "etwas (Akkusativ) in die Wege leiten。複数形 Wege を使う固定表現。" }, ["weitere Schritte in die Wege leiten", "eine Prüfung veranlassen"], "単に始めるより、必要な関係者や手続きを動かし始めた含みがあります。", ["veranlassen", "einleiten"]),
    card("b2-002", "im Nachhinein", "im Nachhinein", "collocation", "adverb", "後になって、振り返ると", "Im Nachhinein hätte ich die Vereinbarung schriftlich bestätigen sollen.", "振り返れば、その合意を書面で確認すべきでした。", ["daily", "housing", "work"], { usage: "過去を振り返る副詞句。接続法II過去とよく組み合わせる。" }, ["erst im Nachhinein", "im Nachhinein betrachtet"], "過去への反省では hätte/sollte の接続法と組み合わせると自然です。", ["nachträglich", "rückblickend"]),
    card("b2-003", "unter der Voraussetzung", "unter der Voraussetzung, dass ...", "collocation", "phrase", "〜という条件のもとで", "Eine Verlängerung ist unter der Voraussetzung möglich, dass alle Nachweise vorliegen.", "すべての証明がそろっていることを条件に延長できます。", ["daily", "administration", "work"], { usage: "unter der Voraussetzung, dass + 従属節。dass 節の動詞は文末。" }, ["unter bestimmten Voraussetzungen", "Voraussetzung dafür ist"], "条件を明確に限定する、書面向きの表現です。", ["sofern", "die Bedingung"]),
    card("b2-004", "in Betracht ziehen", "etwas in Betracht ziehen", "collocation", "phrase", "〜を選択肢として検討する", "Wir ziehen eine einvernehmliche Lösung in Betracht.", "双方合意による解決を選択肢として検討しています。", ["daily", "housing", "work"], { usage: "etwas (Akkusativ) in Betracht ziehen。分離動詞ではない固定表現。" }, ["eine Alternative in Betracht ziehen", "nicht in Betracht kommen"], "候補に入れる ziehen と、候補になり得る kommen を使い分けます。", ["erwägen", "berücksichtigen"]),
    card("b2-005", "sich herausstellen", "sich als etwas herausstellen", "phrase", "verb", "〜だと判明する", "Der vermeintliche Fehler stellte sich als Missverständnis heraus.", "誤りと思われたものは誤解だと判明しました。", ["daily", "administration", "work"], { third_person: "stellt sich heraus", past_participle: "herausgestellt", auxiliary: "haben", separable: true, reflexive: true, government: "als + 名詞 / dass + 従属節" }, ["sich später herausstellen", "wie sich herausgestellt hat"], "調査や経過の後に事実が分かったときに使います。", ["sich ergeben", "feststellen"]),
    card("b2-006", "weitgehend", "weitgehend", "word", "adverb", "大部分は、ほぼ", "Die Angaben stimmen weitgehend mit den Unterlagen überein.", "記載内容は書類とおおむね一致しています。", ["daily", "administration", "work"], { usage: "程度を表す副詞。完全一致ではない余地を残す。" }, ["weitgehend abgeschlossen", "weitgehend übereinstimmen"], "vollständig より断定を弱めつつ、大部分が当てはまることを示します。", ["größtenteils", "vollständig"]),
    card("b2-007", "verbindlich", "verbindlich", "word", "adjective", "拘束力のある、確定した", "Bitte teilen Sie mir den verbindlichen Termin schriftlich mit.", "確定した日時を書面でお知らせください。", ["daily", "administration", "work"], { usage: "形容詞・副詞。法的拘束力または確定性を表す。" }, ["verbindlich zusagen", "eine verbindliche Auskunft"], "freundlich の意味ではなく、約束や情報が確定的であることを表します。", ["unverbindlich", "bindend"]),
    card("b2-008", "Nacherfüllung", "die Nacherfüllung", "word", "noun", "追完（修理または代替品提供）", "Ich bitte zunächst um Nacherfüllung innerhalb einer angemessenen Frist.", "まず相当な期限内の追完を求めます。", ["shopping"], { article: "die", plural: "Nacherfüllungen" }, ["Nacherfüllung verlangen", "eine Frist zur Nacherfüllung setzen"], "不具合の解決として修理や交換を求める法的・実務的な語です。", ["die Nachbesserung", "die Ersatzlieferung"]),
    card("b2-009", "Sachmangel", "der Sachmangel", "word", "noun", "商品の契約不適合・物の欠陥", "Der Defekt stellt einen Sachmangel dar.", "その故障は商品の契約不適合に当たります。", ["shopping", "housing"], { article: "der", plural: "Sachmängel" }, ["ein Sachmangel liegt vor", "für Sachmängel haften"], "日常語 Mangel より、契約上の物の欠陥を明確にする語です。", ["der Mangel", "die Gewährleistung"]),
    card("b2-010", "vom Vertrag zurücktreten", "vom Vertrag zurücktreten", "collocation", "phrase", "契約を解除する", "Sollte die Nacherfüllung scheitern, behalte ich mir vor, vom Vertrag zurückzutreten.", "追完が失敗した場合、契約解除の権利を留保します。", ["shopping", "housing"], { usage: "von + Dativ zurücktreten。完了形 ist zurückgetreten。" }, ["wirksam vom Vertrag zurücktreten", "den Rücktritt erklären"], "単なる Kündigung と異なり、契約を解消する法的効果を示します。", ["der Rücktritt", "widerrufen"]),
    card("b2-011", "eine angemessene Frist setzen", "eine angemessene Frist setzen", "collocation", "phrase", "相当な期限を設定する", "Ich setze Ihnen eine angemessene Frist bis zum 30. September.", "9月30日までの相当な期限を設定します。", ["shopping", "housing", "work"], { usage: "jemandem (Dativ) eine Frist (Akkusativ) setzen。" }, ["eine Frist zur Behebung setzen", "innerhalb der gesetzten Frist"], "期限日だけでなく、何のための期限かを zur + 名詞で示すと明確です。", ["die Frist", "fristgerecht"]),
    card("b2-012", "unverzüglich", "unverzüglich", "word", "adjective", "遅滞なく、速やかに", "Bitte melden Sie den Schaden unverzüglich der Hausverwaltung.", "損傷は遅滞なく管理会社へ届けてください。", ["shopping", "housing", "administration"], { usage: "形容詞・副詞。法的文脈では『責任のある遅滞なく』という含み。" }, ["unverzüglich mitteilen", "unverzüglich reagieren"], "sofort と近いですが、正式文書では不当な遅れがないことを示します。", ["sofort", "umgehend"]),
    card("b2-013", "Beweislast", "die Beweislast", "word", "noun", "立証責任", "Wer die Beweislast trägt, hängt vom Zeitpunkt des Mangels ab.", "誰が立証責任を負うかは、不具合が生じた時期によります。", ["shopping"], { article: "die", plural: "通常は単数形" }, ["die Beweislast tragen", "Umkehr der Beweislast"], "法的評価が必要な語なので、具体的な案件では専門窓口へ確認します。", ["der Beweis", "nachweisen"]),
    card("b2-014", "Gutschrift", "die Gutschrift", "word", "noun", "クレジット処理、返金伝票", "Die Gutschrift wird mit der nächsten Rechnung verrechnet.", "クレジット額は次回請求と相殺されます。", ["shopping", "work"], { article: "die", plural: "Gutschriften" }, ["eine Gutschrift ausstellen", "mit einer Rechnung verrechnen"], "現金返金 Erstattung ではなく、口座・請求上の貸方処理を指すことがあります。", ["die Erstattung", "verrechnen"]),
    card("b2-015", "Ersatzanspruch", "der Ersatzanspruch", "word", "noun", "補償・代替を求める権利", "Ob ein Ersatzanspruch besteht, muss im Einzelfall geprüft werden.", "補償請求権があるかは個別に確認する必要があります。", ["shopping"], { article: "der", plural: "Ersatzansprüche" }, ["einen Ersatzanspruch prüfen", "Ansprüche geltend machen"], "権利があると断定せず、個別確認が必要だと伝える文脈で使います。", ["der Anspruch", "der Schadensersatz"]),
    card("b2-016", "Ermessensentscheidung", "die Ermessensentscheidung", "word", "noun", "裁量判断", "Die Behörde muss ihre Ermessensentscheidung nachvollziehbar begründen.", "当局は裁量判断を理解できる形で理由付けする必要があります。", ["administration"], { article: "die", plural: "Ermessensentscheidungen" }, ["Ermessen ausüben", "eine Entscheidung begründen"], "自動的に決まるのではなく、法の範囲で判断の余地がある場面を示します。", ["das Ermessen", "die Begründung"]),
    card("b2-017", "Rechtsbehelfsbelehrung", "die Rechtsbehelfsbelehrung", "word", "noun", "不服申立て方法の案内", "Die Rechtsbehelfsbelehrung finden Sie am Ende des Bescheids.", "不服申立て方法の案内は決定通知の末尾にあります。", ["administration"], { article: "die", plural: "Rechtsbehelfsbelehrungen" }, ["die Rechtsbehelfsbelehrung prüfen", "am Ende des Bescheids"], "申立て先・形式・期限が記載されるため、Bescheid と一緒に確認します。", ["der Rechtsbehelf", "der Widerspruch"]),
    card("b2-018", "Mitwirkungspflicht", "die Mitwirkungspflicht", "word", "noun", "手続きへの協力義務", "Die Mitwirkungspflicht umfasst die rechtzeitige Vorlage der Unterlagen.", "協力義務には書類の期限内提出が含まれます。", ["administration"], { article: "die", plural: "Mitwirkungspflichten" }, ["eine Mitwirkungspflicht erfüllen", "gegen Mitwirkungspflichten verstoßen"], "必要な情報・書類の提出など、申請者側の協力を指します。", ["mitwirken", "die Pflicht"]),
    card("b2-019", "fristwahrend", "fristwahrend", "word", "adjective", "期限を守る効力のある", "Zur Fristwahrung reiche ich den Widerspruch zunächst ohne Begründung ein.", "期限を守るため、まず理由書なしで異議申立てを提出します。", ["administration"], { usage: "形容詞・副詞。zur Fristwahrung という名詞句でもよく使う。" }, ["fristwahrend einreichen", "zur Fristwahrung"], "実際に理由の後日提出が可能かは案内や専門家へ確認します。", ["fristgerecht", "die Frist"]),
    card("b2-020", "beglaubigte Kopie", "die beglaubigte Kopie", "collocation", "phrase", "認証済みの写し", "Reicht eine einfache Kopie aus, oder benötigen Sie eine beglaubigte Kopie?", "通常の写しで足りますか、それとも認証済みの写しが必要ですか。", ["administration"], { usage: "形容詞 beglaubigt + Kopie。定冠詞後は beglaubigte。" }, ["eine Kopie beglaubigen lassen", "amtlich beglaubigt"], "原本 Original、通常の写し einfache Kopie と区別して確認します。", ["die Beglaubigung", "das Original"]),
    card("b2-021", "Sachstandsanfrage", "die Sachstandsanfrage", "word", "noun", "案件の進捗照会", "Nach drei Monaten habe ich eine höfliche Sachstandsanfrage geschickt.", "3か月後、丁寧な進捗照会を送りました。", ["administration"], { article: "die", plural: "Sachstandsanfragen" }, ["eine Sachstandsanfrage stellen", "schriftlich nach dem Sachstand fragen"], "催促と断定せず、現在の状況と不足事項を丁寧に確認する文面に向きます。", ["der Sachstand", "der Bearbeitungsstand"]),
    card("b2-022", "Widerspruch einlegen", "Widerspruch einlegen", "collocation", "phrase", "異議申立てを行う", "Gegen diese Entscheidung lege ich hiermit fristgerecht Widerspruch ein.", "この決定に対し、ここに期限内の異議申立てを行います。", ["administration"], { usage: "gegen + Akkusativ Widerspruch einlegen。einlegen は分離動詞。" }, ["fristgerecht Widerspruch einlegen", "den Widerspruch begründen"], "形式・提出先・期限は Rechtsbehelfsbelehrung で確認します。", ["der Widerspruch", "die Begründung"]),
    card("b2-023", "Härtefall", "der Härtefall", "word", "noun", "例外的配慮を要する困難事例", "Ob ein Härtefall vorliegt, wird anhand der persönlichen Umstände geprüft.", "困難事例に当たるかは個別事情に基づいて審査されます。", ["administration", "housing"], { article: "der", plural: "Härtefälle" }, ["einen Härtefall geltend machen", "besondere Härte"], "単に困っているという意味ではなく、制度上の例外要件に関わる語です。", ["die Ausnahme", "die Umstände"]),
    card("b2-024", "Akteneinsicht", "die Akteneinsicht", "word", "noun", "記録・事件簿の閲覧", "Ich bitte um Auskunft, wie ich Akteneinsicht beantragen kann.", "記録閲覧をどのように申請できるか教えてください。", ["administration"], { article: "die", plural: "通常は単数形" }, ["Akteneinsicht beantragen", "Akteneinsicht gewähren"], "閲覧範囲や手続きは案件により異なるため、方法を確認します。", ["die Akte", "Einsicht nehmen"]),
    card("b2-025", "Vorerkrankung", "die Vorerkrankung", "word", "noun", "既往症、持病", "Bitte geben Sie relevante Vorerkrankungen und frühere Operationen an.", "関連する既往症と過去の手術を記入してください。", ["medical"], { article: "die", plural: "Vorerkrankungen" }, ["relevante Vorerkrankungen", "eine Vorerkrankung angeben"], "現在の症状 Beschwerde と、過去からある疾患 Vorerkrankung を区別します。", ["die Erkrankung", "die Krankengeschichte"]),
    card("b2-026", "Unverträglichkeit", "die Unverträglichkeit", "word", "noun", "不耐症、薬や食品が合わないこと", "Bestehen bekannte Unverträglichkeiten gegenüber bestimmten Wirkstoffen?", "特定の有効成分に対する既知の不耐症はありますか。", ["medical"], { article: "die", plural: "Unverträglichkeiten", government: "gegenüber + Dativ" }, ["eine Unverträglichkeit angeben", "bekannte Unverträglichkeiten"], "Allergie と同一とは限らないため、分かる範囲で区別して伝えます。", ["die Allergie", "vertragen"]),
    card("b2-027", "Aufklärungsgespräch", "das Aufklärungsgespräch", "word", "noun", "治療・処置前の説明面談", "Vor dem Eingriff findet ein ausführliches Aufklärungsgespräch statt.", "処置前に詳しい説明面談があります。", ["medical"], { article: "das", plural: "Aufklärungsgespräche" }, ["ein Aufklärungsgespräch führen", "über Risiken aufklären"], "目的・代替手段・リスクを理解し、質問するための面談です。", ["die Einwilligung", "der Eingriff"]),
    card("b2-028", "Nutzen-Risiko-Abwägung", "die Nutzen-Risiko-Abwägung", "word", "noun", "利益とリスクの比較検討", "Die Entscheidung beruht auf einer individuellen Nutzen-Risiko-Abwägung.", "その判断は個別の利益・リスク評価に基づきます。", ["medical"], { article: "die", plural: "Nutzen-Risiko-Abwägungen" }, ["eine Abwägung vornehmen", "Nutzen und Risiken abwägen"], "医療者へ利点と不利益を分けて尋ねるときに役立つ語です。", ["abwägen", "das Risiko"]),
    card("b2-029", "Dosierung anpassen", "die Dosierung anpassen", "collocation", "phrase", "用量を調整する", "Bitte ändern Sie die Dosierung nicht, ohne Rücksprache zu halten.", "相談せずに用量を変更しないでください。", ["medical"], { usage: "Dosierung (Akkusativ) anpassen; an + Akkusativ で適合先を示せる。" }, ["die Dosierung schrittweise anpassen", "an das Körpergewicht anpassen"], "自己判断で変更せず、医師・薬剤師と確認する文脈で使います。", ["die Dosis", "Rücksprache halten"]),
    card("b2-030", "Behandlungsverlauf", "der Behandlungsverlauf", "word", "noun", "治療経過", "Der bisherige Behandlungsverlauf wird im Arztbrief zusammengefasst.", "これまでの治療経過は診療情報提供書にまとめられます。", ["medical"], { article: "der", plural: "Behandlungsverläufe" }, ["den Behandlungsverlauf dokumentieren", "bisheriger Verlauf"], "症状の経過だけでなく、治療と反応の推移をまとめて指します。", ["der Verlauf", "der Arztbrief"]),
    card("b2-031", "Therapieoption", "die Therapieoption", "word", "noun", "治療選択肢", "Welche Therapieoptionen kommen in meinem Fall infrage?", "私の場合、どの治療選択肢が考えられますか。", ["medical"], { article: "die", plural: "Therapieoptionen" }, ["eine Therapieoption besprechen", "infrage kommen"], "治療法を一つに決める前に選択肢を尋ねる表現です。", ["die Behandlung", "die Alternative"]),
    card("b2-032", "Einwilligung", "die Einwilligung", "word", "noun", "同意、承諾", "Sie können Ihre Einwilligung jederzeit widerrufen.", "同意はいつでも撤回できます。", ["medical", "administration"], { article: "die", plural: "Einwilligungen" }, ["eine Einwilligung erteilen", "die Einwilligung widerrufen"], "十分な説明を受けたうえでの同意という文脈では、内容を理解した意思表示を指します。", ["einwilligen", "der Widerruf"]),
    card("b2-033", "Staffelmiete", "die Staffelmiete", "word", "noun", "段階的に増額する家賃方式", "Im Vertrag ist eine jährliche Erhöhung als Staffelmiete vereinbart.", "契約では段階家賃として毎年の増額が定められています。", ["housing"], { article: "die", plural: "Staffelmieten" }, ["eine Staffelmiete vereinbaren", "jährliche Mietstaffel"], "増額時期と金額が契約にあらかじめ示される方式です。", ["die Indexmiete", "die Mieterhöhung"]),
    card("b2-034", "Schönheitsreparaturen", "die Schönheitsreparaturen", "word", "noun", "室内の表面的な修繕・模様替え", "Die Klausel zu Schönheitsreparaturen sollte sorgfältig geprüft werden.", "室内修繕に関する条項は慎重に確認すべきです。", ["housing"], { article: "die", plural: "複数形で使用" }, ["Schönheitsreparaturen durchführen", "eine Klausel prüfen"], "名称に反して美観だけでなく塗装などを指し、契約条項の有効性は個別確認が必要です。", ["renovieren", "die Vertragsklausel"]),
    card("b2-035", "Eigenbedarfskündigung", "die Eigenbedarfskündigung", "word", "noun", "貸主側の自己使用を理由とする解約通知", "Die Eigenbedarfskündigung muss konkret begründet werden.", "自己使用を理由とする解約通知には具体的な理由が必要です。", ["housing"], { article: "die", plural: "Eigenbedarfskündigungen" }, ["wegen Eigenbedarfs kündigen", "eine Kündigung prüfen lassen"], "法的要件や期限は事案ごとに異なるため、専門家へ確認します。", ["der Eigenbedarf", "die Kündigung"]),
    card("b2-036", "Mängelanzeige", "die Mängelanzeige", "word", "noun", "不具合の通知", "Die Mängelanzeige sollte den Schaden und das Datum genau beschreiben.", "不具合通知には損傷と日付を正確に記載すべきです。", ["housing"], { article: "die", plural: "Mängelanzeigen" }, ["eine Mängelanzeige senden", "den Mangel dokumentieren"], "写真・発生日・影響・連絡履歴を分けて記録すると明確です。", ["der Mangel", "die Schadensmeldung"]),
    card("b2-037", "Hausfriedensstörung", "die Hausfriedensstörung", "word", "noun", "共同生活の平穏を乱す行為", "Wiederholte nächtliche Ruhestörungen können eine Hausfriedensstörung darstellen.", "夜間の騒音が繰り返されると、共同生活の平穏を乱す行為に当たり得ます。", ["housing"], { article: "die", plural: "Hausfriedensstörungen" }, ["eine Störung dokumentieren", "wiederholte Ruhestörung"], "単発の生活音と断定せず、日時・継続・影響を具体的に記録します。", ["die Ruhestörung", "der Hausfrieden"]),
    card("b2-038", "Vertragsklausel", "die Vertragsklausel", "word", "noun", "契約条項", "Diese Vertragsklausel ist für mich nicht eindeutig formuliert.", "この契約条項は私には明確に書かれていません。", ["housing", "work"], { article: "die", plural: "Vertragsklauseln" }, ["eine Klausel auslegen", "eine unwirksame Klausel"], "不明点は署名前に具体例を挙げて書面で確認します。", ["der Vertrag", "die Regelung"]),
    card("b2-039", "Nebenkostenvorauszahlung", "die Nebenkostenvorauszahlung", "word", "noun", "共益費の前払い額", "Die Nebenkostenvorauszahlung wurde nach der Jahresabrechnung angepasst.", "共益費の前払い額は年次精算後に調整されました。", ["housing"], { article: "die", plural: "Nebenkostenvorauszahlungen" }, ["die Vorauszahlung anpassen", "monatliche Vorauszahlung"], "確定費用ではなく、後で精算される毎月の前払いです。", ["die Betriebskostenabrechnung", "die Nachzahlung"]),
    card("b2-040", "Wohnungsübergabe", "die Wohnungsübergabe", "word", "noun", "住居の引渡し", "Bei der Wohnungsübergabe wurden alle Zählerstände dokumentiert.", "住居の引渡し時に全メーター値が記録されました。", ["housing"], { article: "die", plural: "Wohnungsübergaben" }, ["einen Übergabetermin vereinbaren", "bei der Übergabe dokumentieren"], "鍵・メーター値・状態・プロトコルをまとめて確認します。", ["das Übergabeprotokoll", "der Zählerstand"]),
    card("b2-041", "Nachteilsausgleich", "der Nachteilsausgleich", "word", "noun", "不利益を補う合理的配慮", "Für den Nachteilsausgleich ist ein schriftlicher Antrag erforderlich.", "合理的配慮には書面での申請が必要です。", ["kita-school"], { article: "der", plural: "Nachteilsausgleiche" }, ["einen Nachteilsausgleich beantragen", "individueller Nachteilsausgleich"], "学習目標を下げることとは限らず、条件を公平にするための調整を指します。", ["die Förderung", "die Barrierefreiheit"]),
    card("b2-042", "pädagogisches Konzept", "das pädagogische Konzept", "collocation", "phrase", "教育方針・保育理念", "Im pädagogischen Konzept wird der Umgang mit Mehrsprachigkeit erläutert.", "教育方針には多言語への対応が説明されています。", ["kita-school"], { usage: "形容詞 pädagogisch + 中性名詞 Konzept。定冠詞後は pädagogische。" }, ["ein Konzept umsetzen", "das Konzept der Einrichtung"], "理念だけでなく、日々の保育・教育でどう実践するかも確認します。", ["die Pädagogik", "die Einrichtung"]),
    card("b2-043", "Eingliederungshilfe", "die Eingliederungshilfe", "word", "noun", "社会参加・教育参加のための支援", "Wir möchten klären, welche Stelle für die Eingliederungshilfe zuständig ist.", "参加支援をどの機関が担当するか確認したいです。", ["kita-school", "administration"], { article: "die", plural: "通常は単数形" }, ["Eingliederungshilfe beantragen", "Leistungen der Eingliederungshilfe"], "担当機関や要件が状況により異なるため、管轄を最初に確認します。", ["die Teilhabe", "der Förderbedarf"]),
    card("b2-044", "schriftliche Stellungnahme", "die schriftliche Stellungnahme", "collocation", "phrase", "書面による見解・意見書", "Die Schule hat uns um eine schriftliche Stellungnahme gebeten.", "学校から書面での見解提出を求められました。", ["kita-school", "administration", "work"], { usage: "zu + Dativ Stellung nehmen / eine Stellungnahme zu + Dativ abgeben。" }, ["eine Stellungnahme abgeben", "zu einem Vorwurf Stellung nehmen"], "事実、評価、希望する対応を分けて書くと伝わりやすくなります。", ["Stellung nehmen", "die Begründung"]),
    card("b2-045", "Entwicklungsstand", "der Entwicklungsstand", "word", "noun", "発達の現在段階", "Der Entwicklungsstand wird anhand verschiedener Beobachtungen eingeschätzt.", "発達段階は複数の観察に基づいて評価されます。", ["kita-school"], { article: "der", plural: "Entwicklungsstände" }, ["den Entwicklungsstand einschätzen", "altersgemäßer Entwicklungsstand"], "一つの場面だけでなく、複数の観察と専門的判断に基づく語です。", ["die Entwicklung", "der Förderbedarf"]),
    card("b2-046", "Entscheidungsgrundlage", "die Entscheidungsgrundlage", "word", "noun", "判断材料、意思決定の根拠", "Für eine belastbare Entscheidungsgrundlage fehlen uns noch aktuelle Zahlen.", "信頼できる判断材料には最新の数値がまだ不足しています。", ["work"], { article: "die", plural: "Entscheidungsgrundlagen" }, ["eine Entscheidungsgrundlage schaffen", "auf dieser Grundlage entscheiden"], "単なる情報ではなく、判断を支える根拠として整理された材料を指します。", ["die Grundlage", "die Bewertung"]),
    card("b2-047", "Handlungsspielraum", "der Handlungsspielraum", "word", "noun", "裁量・行動の余地", "Innerhalb des Budgets haben die Teams einen gewissen Handlungsspielraum.", "予算内で各チームには一定の裁量があります。", ["work"], { article: "der", plural: "Handlungsspielräume" }, ["Handlungsspielraum haben", "den Spielraum erweitern"], "完全な自由ではなく、制約内で選べる範囲を表します。", ["das Ermessen", "die Vorgabe"]),
    card("b2-048", "zur Kenntnis nehmen", "etwas zur Kenntnis nehmen", "collocation", "phrase", "〜を承知する、認識する", "Wir haben Ihre Anmerkungen zur Kenntnis genommen und prüfen sie derzeit.", "ご意見は承知しており、現在確認中です。", ["work", "administration"], { usage: "etwas (Akkusativ) zur Kenntnis nehmen。完了形 hat zur Kenntnis genommen。" }, ["zustimmend zur Kenntnis nehmen", "etwas lediglich zur Kenntnis nehmen"], "同意を意味するとは限らず、『受け取って認識した』という中立的な表現です。", ["bestätigen", "berücksichtigen"]),
    card("b2-049", "einen Vorschlag unterbreiten", "jemandem einen Vorschlag unterbreiten", "collocation", "phrase", "提案を提示する", "Gern unterbreite ich Ihnen einen alternativen Terminvorschlag.", "喜んで代替日程をご提案します。", ["work"], { usage: "jemandem (Dativ) einen Vorschlag (Akkusativ) unterbreiten。" }, ["einen konkreten Vorschlag unterbreiten", "einen Gegenvorschlag machen"], "machen より改まったメール・交渉向けの表現です。", ["vorschlagen", "der Gegenvorschlag"]),
    card("b2-050", "im Einklang mit", "im Einklang mit etwas", "collocation", "phrase", "〜と整合して、〜に沿って", "Die neue Regelung muss im Einklang mit den Datenschutzvorgaben stehen.", "新しい規則はデータ保護要件と整合していなければなりません。", ["work", "administration"], { usage: "mit + Dativ。im Einklang stehen/bringen の形で使う。" }, ["im Einklang mit dem Gesetz", "miteinander in Einklang bringen"], "単に似ているのではなく、規則・目標・価値と矛盾しないことを示します。", ["übereinstimmen", "vereinbar"])
  ]
};

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const levelFiles = Object.fromEntries(levels.map((level) => [level, `cards-${level.toLowerCase()}.json`]));
const levelTargets = { A1: 650, A2: 650, B1: 1100, B2: 1600, C1: 3000, C2: 3000 };
const totalTarget = Object.values(levelTargets).reduce((sum, count) => sum + count, 0);
const sourceLexiconPath = path.join(rootDir, "content/learn-german/flashcards/cefr-lexicon-source.json");

sceneLabels.general = "総合語彙";

function lemmaKey(value) {
  return String(value || "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function normalizedCuratedCard(level, entry) {
  return {
    card_id: entry.id,
    lemma: entry.lemma,
    display_de: entry.display_de,
    unit_type: entry.unit_type,
    part_of_speech: entry.part_of_speech,
    primary_level: level,
    level_tags: [level],
    topic_tags: [...new Set(entry.scenes.flatMap((scene) => [scene, sceneLabels[scene]]))],
    scene_tags: entry.scenes,
    japanese: entry.japanese,
    example_de: entry.example_de,
    example_ja: entry.example_ja,
    grammar: entry.grammar,
    collocations: entry.collocations,
    learning_note: entry.learning_note,
    related_terms: entry.related_terms,
    source_note: "J-Connect original example and explanation",
    source_refs: ["j-connect-editorial"],
    quality_tier: "editorial-reviewed",
    verification_status: "j-connect-editorial-reviewed",
    updated_at: verifiedDate,
    verified_at: verifiedDate
  };
}

function preferredJapanese(value) {
  return [...new Set(String(value || "").split("、").map((item) => item.trim()).filter(Boolean))]
    .sort((left, right) => [...left].length - [...right].length)
    .slice(0, 3)
    .join("、");
}

function normalizedReferenceCard(level, source, serial) {
  return {
    card_id: `${level.toLowerCase()}-${String(serial).padStart(4, "0")}`,
    lemma: source.lemma,
    display_de: source.display_de,
    unit_type: source.lemma.includes(" ") ? "phrase" : "word",
    part_of_speech: source.part_of_speech,
    primary_level: level,
    level_tags: [level],
    topic_tags: ["general", sceneLabels.general],
    scene_tags: ["general"],
    japanese: preferredJapanese(source.japanese),
    example_de: "",
    example_ja: "",
    grammar: source.grammar || {},
    collocations: [],
    learning_note: "独日辞書の見出し語をドイツ語コーパス頻度で並べた参照カードです。例文と語法は編集レビュー待ちです。",
    related_terms: [],
    source_note: "FreeDict/WikDict German-Japanese headword ranked with Leipzig Corpora Collection frequency samples; CEFR band is a J-Connect study target.",
    source_refs: source.source_refs || ["freedict-deu-jpn", "leipzig-corpora"],
    quality_tier: "reference",
    verification_status: "source-aligned-needs-editorial-review",
    frequency_rank: source.rank,
    selection_score: source.selection_score,
    corpus_coverage: source.corpus_coverage,
    updated_at: generatedDate,
    verified_at: null
  };
}

const editorialA1Priority = new Map(`
Abend Adresse Alter Antwort Apfel Arbeit Arzt Auto Bahnhof Bank Bauch Baum Bett Bier Bild Brot Bruder Buch Bus Computer Datum Dorf Dusche Ei Eltern Essen Familie Fenster Fisch Fleisch Frage Frau Freund Frühstück Fuß Garten Geld Geschäft Getränk Haus Hilfe Hotel Hund Hunger Jacke Jahr Kaffee Karte Katze Kind Kino Küche Land Lehrer Liebe Mann Milch Minute Mittwoch Monat Morgen Mutter Name Nacht Nummer Obst Papa Park Person Platz Polizei Problem Rechnung Restaurant Samstag Schule Schwester Sohn Sonntag Sprache Stadt Straße Student Stunde Tag Taxi Tee Telefon Tochter Toilette Tür Uhr Vater Wasser Weg Wetter Woche Wohnung Wort Zeit Zimmer Zug
antworten arbeiten bezahlen bleiben brauchen essen fahren finden fragen geben gehen heißen helfen hören kaufen kommen lernen lesen machen nehmen öffnen sagen schlafen schließen schreiben sehen sein sprechen stehen studieren suchen trinken verstehen warten wohnen zeigen
alt billig blau braun deutsch einfach falsch gelb gesund groß grün gut heiß hungrig jung kalt kaputt klein krank langsam neu offen rot schlecht schnell schön schwarz teuer warm weiß wichtig
gestern heute hier immer jetzt links morgen nicht oben rechts sehr unten zusammen
`.trim().split(/\s+/).map((lemma, index) => [lemma, index]));

function sourceSelectionScore(source) {
  const lemma = source.lemma;
  const simpleLength = [...lemma.replace(/\s+/g, "")].length;
  const essentialProperNames = new Set(["Deutschland", "Berlin", "Düsseldorf", "Europa"]);
  const basicAnatomy = new Set(["Auge", "Arm", "Bauch", "Bein", "Blut", "Finger", "Fuß", "Haar", "Hand", "Haut", "Herz", "Knie", "Kopf", "Mund", "Nase", "Ohr", "Rücken", "Zahn"]);
  let penalty = 0;
  if (editorialA1Priority.has(lemma)) return editorialA1Priority.get(lemma);
  if (source.proper_name && !essentialProperNames.has(lemma)) penalty += 8_000;
  if (source.specialist_domain && !basicAnatomy.has(lemma)) penalty += 2_500;
  if (source.corpus_coverage === 0) penalty += 5_000;
  else if (source.corpus_coverage === 1) penalty += 1_800;
  else if (source.corpus_coverage === 2) penalty += 500;
  if (source.part_of_speech === "abbreviation") penalty += 4_000;
  if (source.part_of_speech === "noun") penalty += 100;
  if (lemma.includes(" ")) penalty += 700;
  if (simpleLength > 20) penalty += 2_500;
  else if (simpleLength > 15) penalty += 900;
  else if (simpleLength > 11) penalty += 250;
  if (/(?:ismus|isierung|ität|logie)$/i.test(lemma)) penalty += 1_800;
  else if (/(?:schaft|tion|tät|ment)$/i.test(lemma)) penalty += 1_100;
  else if (/(?:heit|keit|ung)$/i.test(lemma)) penalty += 650;
  return Number(source.rank || 99_999) + penalty;
}

function validateCuratedCards() {
  const ids = new Set();
  for (const [level, entries] of Object.entries(rawCards)) {
    if (entries.length !== 50) throw new Error(`${level} must contain exactly 50 curated cards; found ${entries.length}.`);
    entries.forEach((entry) => {
      if (ids.has(entry.id)) throw new Error(`Duplicate curated card ID: ${entry.id}`);
      ids.add(entry.id);
      if (!/^([ab][12])-\d{3}$/.test(entry.id)) throw new Error(`Invalid curated card ID: ${entry.id}`);
      if (!entry.scenes.length || entry.scenes.some((scene) => !sceneLabels[scene])) throw new Error(`Invalid scenes for ${entry.id}`);
      if (!["word", "phrase", "collocation"].includes(entry.unit_type)) throw new Error(`Invalid unit type for ${entry.id}`);
      if (entry.part_of_speech === "noun" && (!entry.grammar.article || !entry.grammar.plural)) throw new Error(`Missing noun grammar for ${entry.id}`);
      if (entry.part_of_speech === "verb" && (!entry.grammar.third_person || !entry.grammar.past_participle || !entry.grammar.auxiliary)) throw new Error(`Missing verb grammar for ${entry.id}`);
      for (const key of ["lemma", "display_de", "japanese", "example_de", "example_ja", "learning_note"]) {
        if (!String(entry[key] || "").trim()) throw new Error(`Missing ${key} for ${entry.id}`);
      }
    });
  }
  if (ids.size !== 200) throw new Error(`Expected 200 unique curated cards; found ${ids.size}.`);
}

function buildLevelCards(sourceEntries) {
  const curatedKeys = new Set(Object.values(rawCards).flat().map((entry) => lemmaKey(entry.lemma)));
  const usedKeys = new Set(curatedKeys);
  const selectedByLevel = {};
  const rankedSources = sourceEntries
    .map((source) => ({ ...source, selection_score: sourceSelectionScore(source) }))
    .sort((left, right) => left.selection_score - right.selection_score || left.rank - right.rank);
  let sourceIndex = 0;

  for (const level of levels) {
    const curated = (rawCards[level] || []).map((entry) => normalizedCuratedCard(level, entry));
    const selected = [...curated];
    while (selected.length < levelTargets[level]) {
      const source = rankedSources[sourceIndex];
      sourceIndex += 1;
      if (!source) throw new Error(`Source lexicon ended while filling ${level}.`);
      const key = lemmaKey(source.lemma);
      if (!key || usedKeys.has(key) || source.source_dictionary !== "freedict-deu-jpn") continue;
      usedKeys.add(key);
      selected.push(normalizedReferenceCard(level, source, selected.length + 1));
    }
    selectedByLevel[level] = selected;
  }

  return selectedByLevel;
}

function validateGeneratedCards(cardsByLevel) {
  const ids = new Set();
  const lemmas = new Set();
  for (const level of levels) {
    const cards = cardsByLevel[level];
    if (cards.length !== levelTargets[level]) throw new Error(`${level} expected ${levelTargets[level]} cards; found ${cards.length}.`);
    for (const entry of cards) {
      if (!/^(?:a1|a2|b1|b2|c1|c2)-\d{3,4}$/.test(entry.card_id)) throw new Error(`Invalid card ID: ${entry.card_id}`);
      if (ids.has(entry.card_id)) throw new Error(`Duplicate card ID: ${entry.card_id}`);
      ids.add(entry.card_id);
      const key = lemmaKey(entry.lemma);
      if (lemmas.has(key)) throw new Error(`Duplicate lemma across level inventories: ${entry.lemma}`);
      lemmas.add(key);
      for (const field of ["lemma", "display_de", "japanese", "part_of_speech", "quality_tier", "verification_status"]) {
        if (!String(entry[field] || "").trim()) throw new Error(`Missing ${field} for ${entry.card_id}`);
      }
      if (entry.quality_tier === "editorial-reviewed" && (!entry.example_de || !entry.example_ja)) {
        throw new Error(`Editorial card lacks examples: ${entry.card_id}`);
      }
    }
  }
  if (ids.size !== totalTarget) throw new Error(`Expected ${totalTarget} cards; found ${ids.size}.`);
}

function idsFor(level, cardsByLevel) {
  return cardsByLevel[level].map((entry) => entry.card_id);
}

function idsForScene(scene, limit = 36) {
  const byLevel = Object.values(rawCards).map((entries) => entries.filter((entry) => entry.scenes.includes(scene)));
  const selected = [];
  for (let index = 0; selected.length < limit; index += 1) {
    let added = false;
    for (const entries of byLevel) {
      if (entries[index]) {
        selected.push(entries[index].id);
        added = true;
        if (selected.length === limit) break;
      }
    }
    if (!added) break;
  }
  return selected;
}

function levelsForIds(cardIds) {
  return levels.filter((level) => cardIds.some((id) => id.startsWith(level.toLowerCase())));
}

function createDeck(id, title, description, cardIds, scenes, minutes, options = {}) {
  const deckLevels = levelsForIds(cardIds);
  return {
    deck_id: id,
    title_ja: title,
    description_ja: description,
    primary_level: options.primaryLevel || deckLevels.at(-1),
    target_level: options.primaryLevel || deckLevels.at(-1),
    levels: deckLevels,
    scenes,
    scene_labels: scenes.map((scene) => sceneLabels[scene]),
    deck_kind: options.deckKind || "scene-practice",
    card_count: cardIds.length,
    estimated_minutes: minutes,
    card_files: deckLevels.map((level) => levelFiles[level]),
    card_ids: cardIds,
    featured: Boolean(options.featured)
  };
}

function buildDecks(cardsByLevel) {
  const allScenes = Object.keys(sceneLabels);
  return [
    createDeck("a1-life-basics", "A1 レベル別語彙650", "A1だけの入門・身近な語彙650語です。下位レベルの語彙はありません。", idsFor("A1", cardsByLevel), allScenes, 325, { primaryLevel: "A1", deckKind: "cefr-level", featured: true }),
    createDeck("a2-daily-independence", "A2 レベル別語彙650", "A1を除外した、A2だけの日常生活・基本的な用事の語彙650語です。", idsFor("A2", cardsByLevel), allScenes, 325, { primaryLevel: "A2", deckKind: "cefr-level", featured: true }),
    createDeck("b1-explain-and-confirm", "B1 レベル別語彙1,100", "A1・A2を除外した、B1だけの身近な話題・社会生活の語彙1,100語です。", idsFor("B1", cardsByLevel), allScenes, 550, { primaryLevel: "B1", deckKind: "cefr-level", featured: true }),
    createDeck("b2-negotiate-and-document", "B2 レベル別語彙1,600", "A1〜B1を除外した、B2だけの専門・抽象トピックの語彙1,600語です。", idsFor("B2", cardsByLevel), allScenes, 800, { primaryLevel: "B2", deckKind: "cefr-level", featured: true }),
    createDeck("c1-broad-repertoire", "C1 レベル別語彙3,000", "A1〜B2を除外した、C1だけの幅広い・専門的な語彙3,000語です。", idsFor("C1", cardsByLevel), allScenes, 1500, { primaryLevel: "C1", deckKind: "cefr-level", featured: true }),
    createDeck("c2-nuance-repertoire", "C2 レベル別語彙3,000", "A1〜C1を除外した、C2だけの語感・含意・専門領域の語彙3,000語です。", idsFor("C2", cardsByLevel), allScenes, 1500, { primaryLevel: "C2", deckKind: "cefr-level", featured: true }),
    createDeck("a1-practical-50", "A1 編集済み実践50", "例文・文法・語法を編集レビューした生活ドイツ語50枚です。", idsFor("A1", cardsByLevel).slice(0, 50), allScenes.filter((scene) => scene !== "general"), 25, { primaryLevel: "A1", deckKind: "editorial-practice" }),
    createDeck("a2-practical-50", "A2 編集済み実践50", "例文・文法・語法を編集レビューした生活ドイツ語50枚です。", idsFor("A2", cardsByLevel).slice(0, 50), allScenes.filter((scene) => scene !== "general"), 30, { primaryLevel: "A2", deckKind: "editorial-practice" }),
    createDeck("b1-practical-50", "B1 編集済み実践50", "例文・文法・語法を編集レビューした説明・確認の50枚です。", idsFor("B1", cardsByLevel).slice(0, 50), allScenes.filter((scene) => scene !== "general"), 35, { primaryLevel: "B1", deckKind: "editorial-practice" }),
    createDeck("b2-practical-50", "B2 編集済み実践50", "例文・文法・語法を編集レビューした交渉・文書対応の50枚です。", idsFor("B2", cardsByLevel).slice(0, 50), allScenes.filter((scene) => scene !== "general"), 40, { primaryLevel: "B2", deckKind: "editorial-practice" }),
    createDeck("scene-daily", "日常生活のコア表現", "予定、移動、依頼、連絡で繰り返し使う編集済み表現です。", idsForScene("daily", 32), ["daily"], 18),
    createDeck("scene-shopping", "買い物・Pfand・返品", "スーパー、Pfand返却、交換・返金、消費者対応で役立つ編集済み表現です。", idsForScene("shopping", 28), ["shopping"], 16),
    createDeck("scene-administration", "外国人局・役所の手続き", "Anmeldung、滞在許可、追加書類、期限、異議申立ての編集済み表現です。", idsForScene("administration", 36), ["administration"], 22),
    createDeck("scene-medical", "病院・薬局・予約", "受診、検査、処方、副作用、治療方針を確認する編集済み表現です。", idsForScene("medical", 34), ["medical"], 20),
    createDeck("scene-housing", "住まい・大家・契約", "内見、家賃、不具合、解約、契約条項を扱う編集済み表現です。", idsForScene("housing", 36), ["housing"], 22),
    createDeck("scene-kita-school", "Kita・学校との連絡", "送迎、欠席、面談、支援制度について連絡する編集済み表現です。", idsForScene("kita-school", 30), ["kita-school"], 18),
    createDeck("scene-work", "職場・メール・会議", "遅刻連絡、メール、会議、合意形成、優先順位づけに使う編集済み表現です。", idsForScene("work", 36), ["work"], 22)
  ];
}

function writeJson(fileName, value, pretty = false) {
  fs.writeFileSync(path.join(outputDir, fileName), `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`, "utf8");
}

validateCuratedCards();
if (!fs.existsSync(sourceLexiconPath)) {
  throw new Error(`Missing prepared source lexicon: ${path.relative(rootDir, sourceLexiconPath)}. Run prepare-cefr-lexicon.mjs first.`);
}
const sourcePayload = JSON.parse(fs.readFileSync(sourceLexiconPath, "utf8"));
const cardsByLevel = buildLevelCards(sourcePayload.entries || []);
validateGeneratedCards(cardsByLevel);
fs.mkdirSync(outputDir, { recursive: true });

for (const level of levels) {
  writeJson(levelFiles[level], {
    schema_version: 2,
    level,
    level_card_count: levelTargets[level],
    updated_at: generatedDate,
    cards: cardsByLevel[level]
  });
}

const decks = buildDecks(cardsByLevel);
writeJson("decks.json", {
  schema_version: 2,
  updated_at: generatedDate,
  level_note_ja: "CEFRは能力記述であり、公式の全単語リストはありません。各帯の語彙割当は、正式資料と頻度資料を基にしたJ-Connect独自のレベル別学習目標です。各レベル教材に下位レベルの語彙は含みません。",
  quality_note_ja: "200枚は例文・文法・語法まで編集済みです。残り9,800枚は出典付き参照カードで、例文・詳細語法は順次編集レビューします。",
  storage_note_ja: "学習記録はこの端末のブラウザに保存されます。",
  license_note_ja: "FreeDict由来の辞書データを含む語彙カード部分はCC BY-SA 3.0で提供します。Leipzig Corpora Collectionの帰属情報も保持します。",
  level_counts: levelTargets,
  total_card_count: totalTarget,
  scene_labels: sceneLabels,
  card_sources: levelFiles,
  methodology_url: "#flashcardsSources",
  sources: sourcePayload.licenses,
  decks
});

console.log(`Generated ${decks.length} flashcard decks and ${Object.values(cardsByLevel).flat().length} unique A1-C2 cards.`);
