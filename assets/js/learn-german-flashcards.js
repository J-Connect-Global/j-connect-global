(function initializeFlashcardsApp() {
  "use strict";

  const root = document.querySelector("[data-flashcards-app]");
  if (!root) return;

  const DECKS_URL = "/assets/data/learn-german/flashcards/decks.json";
  const DATA_BASE = "/assets/data/learn-german/flashcards/";
  const INVENTORY_SCRIPT_URL = "/assets/js/learn-german-flashcards-inventory.js";
  const BACKUP_SCHEMA_VERSION = 1;
  const LAST_DECK_KEY = "jconnect-flashcards-last-deck";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const storage = window.JConnectFlashcardStorage;
  const partOfSpeechLabels = {
    noun: "名詞",
    verb: "動詞",
    adjective: "形容詞",
    adverb: "副詞",
    phrase: "表現",
    abbreviation: "略語",
    conjunction: "接続詞",
    interjection: "間投詞",
    numeral: "数詞",
    particle: "助詞",
    preposition: "前置詞",
    pronoun: "代名詞"
  };
  const ratingLabels = { again: "もう一度", unsure: "迷った", known: "覚えた" };
  const sceneLabels = {
    daily: "日常",
    shopping: "買い物",
    administration: "外国人局・役所",
    medical: "病院・薬局",
    housing: "住まい",
    "kita-school": "Kita・学校",
    work: "仕事",
    general: "総合語彙"
  };

  const elements = {
    loading: root.querySelector("#flashcardsLoading"),
    error: root.querySelector("#flashcardsError"),
    picker: root.querySelector("#flashcardsDeckPicker"),
    pickerGrid: root.querySelector("#flashcardsDeckPickerGrid"),
    setup: root.querySelector("#flashcardsSetup"),
    setupTitle: root.querySelector("#sessionSetupTitle"),
    setupDescription: root.querySelector("#setupDeckDescription"),
    setupBadges: root.querySelector("#setupDeckBadges"),
    resumeNote: root.querySelector("#flashcardsResumeNote"),
    start: root.querySelector("#flashcardsStart"),
    resume: root.querySelector("#flashcardsResume"),
    chooseAnother: root.querySelector("#flashcardsChooseAnother"),
    study: root.querySelector("#flashcardsStudy"),
    studyTitle: root.querySelector("#studyDeckTitle"),
    studyBadges: root.querySelector("#studyDeckBadges"),
    endSession: root.querySelector("#flashcardsEndSession"),
    position: root.querySelector("#flashcardsPosition"),
    progressText: root.querySelector("#flashcardsProgressText"),
    progressTrack: root.querySelector(".flashcards-progress__track"),
    progressBar: root.querySelector("#flashcardsProgressBar"),
    directionLabel: root.querySelector("#flashcardsDirectionLabel"),
    speak: root.querySelector("#flashcardsSpeak"),
    speakExample: root.querySelector("#flashcardsSpeakExample"),
    speechFallback: root.querySelector("#flashcardsSpeechFallback"),
    flip: root.querySelector("#flashcardFlip"),
    flipControl: root.querySelector("#flashcardFlipControl"),
    front: root.querySelector(".flashcard__front"),
    back: root.querySelector(".flashcard__back"),
    prompt: root.querySelector("#flashcardPrompt"),
    answer: root.querySelector("#flashcardAnswer"),
    exampleDe: root.querySelector("#flashcardExampleDe"),
    exampleJa: root.querySelector("#flashcardExampleJa"),
    detailsToggle: root.querySelector("#flashcardsDetailsToggle"),
    details: root.querySelector("#flashcardsDetails"),
    partOfSpeech: root.querySelector("#flashcardPartOfSpeech"),
    grammar: root.querySelector("#flashcardGrammar"),
    collocations: root.querySelector("#flashcardCollocations"),
    learningNote: root.querySelector("#flashcardLearningNote"),
    related: root.querySelector("#flashcardRelated"),
    ratingButtons: Array.from(root.querySelectorAll("[data-rating]")),
    previous: root.querySelector("#flashcardsPrevious"),
    next: root.querySelector("#flashcardsNext"),
    results: root.querySelector("#flashcardsResults"),
    resultStats: root.querySelector("#flashcardsResultStats"),
    breakdown: root.querySelector("#flashcardsBreakdown"),
    weakList: root.querySelector("#flashcardsWeakList"),
    reviewWeak: root.querySelector("#flashcardsReviewWeak"),
    restart: root.querySelector("#flashcardsRestart"),
    downloadCsv: root.querySelector("#flashcardsDownloadCsv"),
    backup: root.querySelector("#flashcardsBackup"),
    restore: root.querySelector("#flashcardsRestore"),
    reset: root.querySelector("#flashcardsReset"),
    resetDialog: root.querySelector("#flashcardsResetDialog"),
    confirmReset: root.querySelector("#flashcardsConfirmReset"),
    inventory: root.querySelector("#flashcardsInventory"),
    toast: root.querySelector("#flashcardsToast")
  };

  const state = {
    payload: null,
    decks: [],
    currentDeck: null,
    cardsById: new Map(),
    inventoryController: null,
    session: null,
    restoredSession: null,
    isFlipped: false,
    activeSpeechButton: null,
    speechUtterance: null,
    toastTimer: null
  };

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    state.toastTimer = window.setTimeout(() => { elements.toast.hidden = true; }, 4200);
  }

  function showError(message, error) {
    elements.loading.hidden = true;
    elements.error.textContent = message;
    elements.error.hidden = false;
    if (error) console.error(error);
  }

  function showOnly(section) {
    elements.picker.hidden = section !== "picker";
    elements.setup.hidden = section !== "setup";
    elements.study.hidden = section !== "study";
    elements.results.hidden = section !== "results";
  }

  function rememberDeck(deckId) {
    try {
      localStorage.setItem(LAST_DECK_KEY, deckId);
    } catch {
      // The deck query parameter remains the source of truth.
    }
  }

  function selectedValue(name) {
    return root.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function setSelectedValue(name, value) {
    const input = root.querySelector(`input[name="${name}"][value="${CSS.escape(String(value))}"]`);
    if (input) input.checked = true;
  }

  function shuffle(values) {
    const output = [...values];
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
    }
    return output;
  }

  function formatDuration(milliseconds) {
    const seconds = Math.max(0, Math.round(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes ? `${minutes}分${String(remainder).padStart(2, "0")}秒` : `${remainder}秒`;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("ja-JP", { timeZone: "Europe/Berlin" });
  }

  function formatGrammar(card) {
    const grammar = card.grammar || {};
    const pending = card.quality_tier === "reference";
    if (card.part_of_speech === "noun") {
      if (pending && !grammar.article && !grammar.plural) return "文法情報は編集レビュー待ちです。";
      return [`冠詞: ${grammar.article || "—"}`, `複数形: ${grammar.plural || "—"}`, grammar.declension || ""]
        .filter(Boolean)
        .join(" / ");
    }
    if (card.part_of_speech === "verb") {
      if (pending) return "活用・格支配は編集レビュー待ちです。";
      const properties = [
        `三人称単数: ${grammar.third_person || "—"}`,
        `過去分詞: ${grammar.past_participle || "—"}`,
        `助動詞: ${grammar.auxiliary || "—"}`,
        grammar.separable ? "分離動詞" : "非分離動詞",
        grammar.reflexive ? "再帰動詞" : "非再帰",
        grammar.government ? `格・前置詞: ${grammar.government}` : ""
      ];
      return properties.filter(Boolean).join(" / ");
    }
    return grammar.usage || grammar.government || (pending ? "語法は編集レビュー待ちです。" : "用例の語順をまとまりで確認してください。");
  }

  function createBadges(deck) {
    const fragment = document.createDocumentFragment();
    if (deck.deck_kind === "cefr-level") {
      fragment.append(createElement("span", "flashcards-badge", deck.target_level));
      fragment.append(createElement("span", "flashcards-badge", "レベル専用語彙"));
    } else {
      deck.levels.forEach(level => fragment.append(createElement("span", "flashcards-badge", level)));
      deck.scene_labels.forEach(scene => fragment.append(createElement("span", "flashcards-badge", scene)));
    }
    fragment.append(createElement("span", "flashcards-badge", `${Number(deck.card_count).toLocaleString("ja-JP")}枚`));
    return fragment;
  }

  function deckUrl(deckId) {
    return `/germany/ja/learn-german/flashcards/?deck=${encodeURIComponent(deckId)}`;
  }

  function renderDeckPicker() {
    elements.pickerGrid.replaceChildren();
    state.decks.forEach(deck => {
      const card = createElement("article", "flashcards-picker-card");
      const badges = createElement("div", "flashcards-badges");
      badges.append(createBadges(deck));
      card.append(badges, createElement("h3", "", deck.title_ja), createElement("p", "", deck.description_ja));
      const link = createElement("a", "jc-button is-primary", "この教材を選ぶ");
      link.href = deckUrl(deck.deck_id);
      link.addEventListener("click", event => {
        event.preventDefault();
        const url = new URL(window.location.href);
        url.searchParams.set("deck", deck.deck_id);
        window.history.pushState({}, "", url);
        selectDeck(deck.deck_id);
      });
      card.append(link);
      elements.pickerGrid.append(card);
    });
  }

  function validCardPayload(payload, fileName) {
    if (![1, 2].includes(payload?.schema_version) || !Array.isArray(payload.cards)) throw new Error(`${fileName} has an unsupported schema.`);
    payload.cards.forEach(card => {
      if (!card?.card_id || !card?.display_de || !card?.japanese) throw new Error(`${fileName} contains an invalid card.`);
    });
    return payload.cards;
  }

  async function loadDeckCards(deck) {
    const responses = await Promise.all(deck.card_files.map(fileName => fetch(`${DATA_BASE}${fileName}`, { credentials: "same-origin" })));
    responses.forEach((response, index) => {
      if (!response.ok) throw new Error(`${deck.card_files[index]} could not be loaded (${response.status}).`);
    });
    const payloads = await Promise.all(responses.map(response => response.json()));
    const allCards = payloads.flatMap((payload, index) => validCardPayload(payload, deck.card_files[index]));
    const allById = new Map(allCards.map(card => [card.card_id, card]));
    const orderedCards = deck.card_ids.map(cardId => allById.get(cardId));
    if (orderedCards.some(card => !card)) throw new Error(`Deck ${deck.deck_id} references a missing card.`);
    state.cardsById = new Map(orderedCards.map(card => [card.card_id, card]));
  }

  function emptyProgress(cardId) {
    return {
      card_id: cardId,
      status: "unstarted",
      attempts: 0,
      known_count: 0,
      unsure_count: 0,
      again_count: 0,
      current_streak: 0,
      saved: false
    };
  }

  let inventoryFeaturePromise = null;

  function loadInventoryFeature() {
    if (window.JConnectFlashcardInventory) return Promise.resolve(window.JConnectFlashcardInventory);
    if (inventoryFeaturePromise) return inventoryFeaturePromise;
    inventoryFeaturePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = INVENTORY_SCRIPT_URL;
      script.async = true;
      script.addEventListener("load", () => resolve(window.JConnectFlashcardInventory), { once: true });
      script.addEventListener("error", () => {
        inventoryFeaturePromise = null;
        script.remove();
        reject(new Error("Flashcard inventory feature could not be loaded."));
      }, { once: true });
      document.head.append(script);
    });
    return inventoryFeaturePromise;
  }

  async function startInventorySession(cardIds) {
    if (!cardIds.length) return;
    state.session = createSession(cardIds, {
      direction: selectedValue("session-direction") || "de-ja",
      size: String(cardIds.length),
      order: "inventory-filter"
    });
    state.restoredSession = null;
    await storage.putSession(state.session);
    openStudy();
  }

  async function prepareInventory(deck) {
    if (deck.deck_kind !== "cefr-level") {
      state.inventoryController?.hide();
      elements.inventory.hidden = true;
      return;
    }
    const feature = await loadInventoryFeature();
    if (!feature?.create) throw new Error("Flashcard inventory feature is unavailable.");
    if (!state.inventoryController) {
      state.inventoryController = feature.create({
        root,
        storage,
        partOfSpeechLabels,
        formatGrammar,
        formatDate,
        safeCsvValue,
        downloadBlob,
        showToast,
        startSession: startInventorySession
      });
    }
    await state.inventoryController.prepare(deck, state.cardsById);
  }

  function validRestoredSession(session, deck) {
    return Boolean(
      session
      && session.deck_id === deck.deck_id
      && Array.isArray(session.card_ids)
      && session.card_ids.length > 0
      && session.card_ids.every(cardId => state.cardsById.has(cardId))
      && Number.isInteger(session.last_session_position)
      && session.last_session_position >= 0
      && session.last_session_position < session.card_ids.length
      && session.ratings
      && typeof session.ratings === "object"
    );
  }

  async function selectDeck(deckId) {
    const deck = state.decks.find(candidate => candidate.deck_id === deckId);
    if (!deck) {
      elements.inventory.hidden = true;
      showOnly("picker");
      showToast("指定された教材が見つかりません。教材一覧から選んでください。");
      return;
    }

    elements.loading.hidden = false;
    elements.loading.textContent = "選択した教材を読み込んでいます。";
    elements.error.hidden = true;
    try {
      await loadDeckCards(deck);
      state.currentDeck = deck;
      rememberDeck(deck.deck_id);
      elements.setupTitle.textContent = deck.title_ja;
      elements.setupDescription.textContent = deck.description_ja;
      elements.setupBadges.replaceChildren(createBadges(deck));
      elements.studyTitle.textContent = deck.title_ja;
      elements.studyBadges.replaceChildren(createBadges(deck));
      await prepareInventory(deck);

      const restored = await storage.getSession(deck.deck_id);
      state.restoredSession = validRestoredSession(restored, deck) && !restored.completed ? restored : null;
      if (state.restoredSession) {
        const position = state.restoredSession.last_session_position + 1;
        elements.resumeNote.textContent = `中断したセッションがあります（${position}/${state.restoredSession.card_ids.length}枚目）。`;
        elements.resumeNote.hidden = false;
        elements.resume.hidden = false;
        setSelectedValue("session-size", state.restoredSession.selected_session_size);
        setSelectedValue("session-order", state.restoredSession.selected_order);
        setSelectedValue("session-direction", state.restoredSession.selected_direction);
      } else {
        elements.resumeNote.hidden = true;
        elements.resume.hidden = true;
      }
      elements.loading.hidden = true;
      showOnly("setup");
      elements.setup.scrollIntoView({ block: "start" });
    } catch (error) {
      elements.inventory.hidden = true;
      showError("選択した教材を読み込めませんでした。教材一覧へ戻って再度お試しください。", error);
      showOnly("picker");
    }
  }

  function createSession(cardIds, options = {}) {
    const now = Date.now();
    return {
      schema_version: 1,
      deck_id: state.currentDeck.deck_id,
      card_ids: [...cardIds],
      ratings: {},
      last_session_position: 0,
      selected_direction: options.direction || selectedValue("session-direction") || "de-ja",
      selected_session_size: options.size || selectedValue("session-size") || "10",
      selected_order: options.order || selectedValue("session-order") || "ordered",
      started_at: new Date(now).toISOString(),
      last_activity_at: now,
      elapsed_ms: 0,
      completed: false,
      completed_at: null
    };
  }

  function selectedSessionCardIds() {
    const order = selectedValue("session-order") || "ordered";
    const sizeValue = selectedValue("session-size") || "10";
    const source = order === "shuffle" ? shuffle(state.currentDeck.card_ids) : [...state.currentDeck.card_ids];
    const size = sizeValue === "all" ? source.length : Math.min(Number(sizeValue), source.length);
    return source.slice(0, size);
  }

  async function startNewSession() {
    state.session = createSession(selectedSessionCardIds());
    state.restoredSession = null;
    await storage.putSession(state.session);
    openStudy();
  }

  async function resumeSession() {
    if (!state.restoredSession) return;
    state.session = {
      ...state.restoredSession,
      last_activity_at: Date.now()
    };
    await storage.putSession(state.session);
    openStudy();
  }

  function currentCard() {
    return state.cardsById.get(state.session?.card_ids[state.session.last_session_position]);
  }

  function setFlipped(flipped) {
    if (!flipped && state.activeSpeechButton === elements.speakExample) stopSpeech();
    state.isFlipped = flipped;
    elements.flip.classList.toggle("is-flipped", flipped);
    elements.flipControl.setAttribute("aria-pressed", flipped ? "true" : "false");
    elements.front.setAttribute("aria-hidden", flipped ? "true" : "false");
    elements.back.setAttribute("aria-hidden", flipped ? "false" : "true");
    elements.detailsToggle.disabled = !flipped;
    elements.ratingButtons.forEach(button => { button.disabled = !flipped; });
    if (!flipped) setDetailsExpanded(false);
    updateExampleSpeechButton();
    const card = currentCard();
    if (card) {
      const face = flipped ? "裏面" : "表面";
      const value = flipped
        ? (state.session.selected_direction === "de-ja" ? card.japanese : card.display_de)
        : (state.session.selected_direction === "de-ja" ? card.display_de : card.japanese);
      elements.flipControl.setAttribute("aria-label", `${face}: ${value}。クリック、Enter、Spaceで${flipped ? "表" : "裏"}に切り替えます。`);
    }
  }

  function setDetailsExpanded(expanded) {
    elements.details.hidden = !expanded;
    elements.detailsToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    elements.detailsToggle.textContent = expanded ? "例文・解説を閉じる" : "例文・解説を表示";
  }

  function renderCard() {
    stopSpeech();
    const card = currentCard();
    if (!card) {
      showError("セッション内のカードが見つかりませんでした。教材を選び直してください。");
      return;
    }
    const index = state.session.last_session_position;
    const total = state.session.card_ids.length;
    const percent = Math.round(((index + 1) / total) * 100);
    const deToJa = state.session.selected_direction === "de-ja";
    elements.prompt.textContent = deToJa ? card.display_de : card.japanese;
    elements.answer.textContent = deToJa ? card.japanese : card.display_de;
    elements.exampleDe.textContent = card.example_de || "例文は編集レビュー待ちです。";
    elements.exampleJa.textContent = card.example_ja || "出典付きの語彙参照カードとして先に公開しています。";
    elements.speak.dataset.speechIdleLabel = `ドイツ語「${card.display_de}」を読み上げる`;
    elements.speak.setAttribute("aria-label", elements.speak.dataset.speechIdleLabel);
    elements.speakExample.dataset.speechIdleLabel = card.example_de
      ? `例文「${card.example_de}」をドイツ語で読み上げる`
      : "ドイツ語例文は準備中です";
    elements.speakExample.setAttribute("aria-label", elements.speakExample.dataset.speechIdleLabel);
    elements.partOfSpeech.textContent = `${partOfSpeechLabels[card.part_of_speech] || card.part_of_speech} / ${card.unit_type}`;
    elements.grammar.textContent = formatGrammar(card);
    elements.collocations.textContent = card.collocations.join(" / ") || (card.quality_tier === "reference" ? "編集レビュー待ち" : "—");
    elements.learningNote.textContent = card.learning_note;
    elements.related.textContent = card.related_terms.join(" / ") || (card.quality_tier === "reference" ? "編集レビュー待ち" : "—");
    elements.position.textContent = `${index + 1} / ${total}`;
    elements.progressText.textContent = `${percent}%`;
    elements.progressBar.style.width = `${percent}%`;
    elements.progressTrack.setAttribute("aria-valuenow", String(percent));
    elements.directionLabel.textContent = deToJa ? "ドイツ語 → 日本語" : "日本語 → ドイツ語";
    elements.previous.disabled = index === 0;
    elements.next.disabled = index >= total - 1;
    setFlipped(false);
  }

  function openStudy() {
    showOnly("study");
    renderCard();
    configureSpeech();
    elements.study.scrollIntoView({ block: "start" });
    window.setTimeout(() => elements.flipControl.focus(), 80);
  }

  function addActiveTime() {
    if (!state.session) return;
    const now = Date.now();
    const last = Number(state.session.last_activity_at || now);
    const delta = Math.max(0, Math.min(now - last, 10 * 60 * 1000));
    state.session.elapsed_ms = Number(state.session.elapsed_ms || 0) + delta;
    state.session.last_activity_at = now;
  }

  function nextReviewFor(rating, streak) {
    const intervals = rating === "known"
      ? [1, 3, 7, 14, 30]
      : rating === "unsure" ? [2] : [1];
    const days = rating === "known" ? intervals[Math.min(Math.max(streak - 1, 0), intervals.length - 1)] : intervals[0];
    return new Date(Date.now() + days * DAY_MS).toISOString();
  }

  async function updateCardProgress(cardId, rating) {
    const previous = await storage.getProgress(cardId) || emptyProgress(cardId);
    const currentStreak = rating === "known"
      ? Number(previous.current_streak || 0) + 1
      : rating === "unsure" ? Math.max(0, Number(previous.current_streak || 0) - 1) : 0;
    const progress = {
      ...previous,
      card_id: cardId,
      status: rating === "known" && currentStreak >= 3 ? "mastered" : "reviewing",
      attempts: Number(previous.attempts || 0) + 1,
      known_count: Number(previous.known_count || 0) + (rating === "known" ? 1 : 0),
      unsure_count: Number(previous.unsure_count || 0) + (rating === "unsure" ? 1 : 0),
      again_count: Number(previous.again_count || 0) + (rating === "again" ? 1 : 0),
      last_reviewed: new Date().toISOString(),
      next_review: nextReviewFor(rating, currentStreak),
      current_streak: currentStreak,
      last_result: rating,
      last_session_position: state.session.last_session_position,
      selected_direction: state.session.selected_direction,
      selected_session_size: state.session.selected_session_size
    };
    await storage.putProgress(progress);
    state.inventoryController?.setProgress(progress);
  }

  function nextUnratedIndex() {
    const total = state.session.card_ids.length;
    for (let offset = 1; offset <= total; offset += 1) {
      const candidate = (state.session.last_session_position + offset) % total;
      if (!state.session.ratings[state.session.card_ids[candidate]]) return candidate;
    }
    return -1;
  }

  async function rateCurrentCard(rating) {
    if (!state.isFlipped || !ratingLabels[rating]) return;
    stopSpeech();
    const cardId = currentCard().card_id;
    addActiveTime();
    state.session.ratings[cardId] = rating;
    await updateCardProgress(cardId, rating);
    const nextIndex = nextUnratedIndex();
    if (nextIndex === -1) {
      state.session.completed = true;
      state.session.completed_at = new Date().toISOString();
      await storage.putSession(state.session);
      await renderResults();
      return;
    }
    state.session.last_session_position = nextIndex;
    await storage.putSession(state.session);
    renderCard();
    elements.flipControl.focus();
  }

  async function moveCard(offset) {
    if (!state.session) return;
    const nextIndex = state.session.last_session_position + offset;
    if (nextIndex < 0 || nextIndex >= state.session.card_ids.length) return;
    addActiveTime();
    state.session.last_session_position = nextIndex;
    await storage.putSession(state.session);
    renderCard();
    elements.flipControl.focus();
  }

  async function pauseSession() {
    if (!state.session) return;
    stopSpeech();
    addActiveTime();
    await storage.putSession(state.session);
    state.restoredSession = state.session;
    elements.resumeNote.textContent = `中断したセッションがあります（${state.session.last_session_position + 1}/${state.session.card_ids.length}枚目）。`;
    elements.resumeNote.hidden = false;
    elements.resume.hidden = false;
    showOnly("setup");
    showToast("進捗をこの端末に保存しました。後から続きから再開できます。");
    elements.setup.scrollIntoView({ block: "start" });
  }

  function speechSupported() {
    return typeof window.speechSynthesis?.speak === "function" && typeof window.SpeechSynthesisUtterance === "function";
  }

  function updateExampleSpeechButton() {
    const hasExample = Boolean(currentCard()?.example_de?.trim());
    const available = speechSupported() && hasExample;
    elements.speakExample.hidden = !available;
    elements.speakExample.disabled = !available || !state.isFlipped;
    elements.speakExample.tabIndex = available && state.isFlipped ? 0 : -1;
  }

  function setSpeechButtonState(button, speaking) {
    button.classList.toggle("is-speaking", speaking);
    button.setAttribute("aria-pressed", speaking ? "true" : "false");
    if (button === elements.speak) button.textContent = speaking ? "読み上げを停止" : "ドイツ語を読み上げる";
    const idleLabel = button.dataset.speechIdleLabel || "ドイツ語を読み上げる";
    button.setAttribute("aria-label", speaking ? `${idleLabel}（停止）` : idleLabel);
  }

  function resetSpeechState() {
    [elements.speak, elements.speakExample].forEach(button => setSpeechButtonState(button, false));
    state.activeSpeechButton = null;
    state.speechUtterance = null;
  }

  function stopSpeech() {
    if (speechSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Some embedded browsers expose the API before its speech service is ready.
      }
    }
    resetSpeechState();
  }

  function configureSpeech() {
    const supported = speechSupported();
    elements.speak.hidden = !supported;
    elements.speechFallback.hidden = supported;
    elements.speak.disabled = !supported;
    updateExampleSpeechButton();
  }

  function speakGerman(text, button) {
    if (!text?.trim() || !speechSupported()) return;
    if (state.activeSpeechButton === button) {
      stopSpeech();
      return;
    }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.9;
    const voices = typeof window.speechSynthesis.getVoices === "function" ? window.speechSynthesis.getVoices() : [];
    utterance.voice = voices.find(voice => String(voice.lang).toLowerCase().startsWith("de")) || null;
    state.activeSpeechButton = button;
    state.speechUtterance = utterance;
    setSpeechButtonState(button, true);
    const finish = () => {
      if (state.speechUtterance === utterance) resetSpeechState();
    };
    utterance.onend = finish;
    utterance.onerror = event => {
      const isCurrent = state.speechUtterance === utterance;
      finish();
      if (isCurrent && !["canceled", "interrupted"].includes(event.error)) {
        showToast("音声を再生できませんでした。端末の音声設定を確認してください。");
      }
    };
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      finish();
      showToast("音声を再生できませんでした。端末の音声設定を確認してください。");
    }
  }

  function speakCurrentCard() {
    const card = currentCard();
    if (card) speakGerman(card.display_de, elements.speak);
  }

  function speakCurrentExample() {
    const card = currentCard();
    if (state.isFlipped && card?.example_de) speakGerman(card.example_de, elements.speakExample);
  }

  function resultCounts() {
    const ratings = Object.values(state.session?.ratings || {});
    return {
      total: ratings.length,
      known: ratings.filter(value => value === "known").length,
      unsure: ratings.filter(value => value === "unsure").length,
      again: ratings.filter(value => value === "again").length
    };
  }

  function resultCards() {
    return Object.entries(state.session?.ratings || {})
      .map(([cardId, rating]) => ({ card: state.cardsById.get(cardId), rating }))
      .filter(entry => entry.card);
  }

  function appendResultStat(label, value) {
    const item = createElement("div", "flashcards-result-stat");
    item.append(createElement("span", "", label), createElement("strong", "", value));
    elements.resultStats.append(item);
  }

  async function renderResults() {
    const counts = resultCounts();
    const entries = resultCards();
    const mastery = counts.total ? Math.round((counts.known / counts.total) * 100) : 0;
    elements.resultStats.replaceChildren();
    appendResultStat("学習カード", `${counts.total}枚`);
    appendResultStat("覚えた", `${counts.known}枚`);
    appendResultStat("迷った", `${counts.unsure}枚`);
    appendResultStat("もう一度", `${counts.again}枚`);
    appendResultStat("習得率", `${mastery}%`);
    appendResultStat("所要時間", formatDuration(state.session.elapsed_ms));

    const groups = new Map();
    entries.forEach(({ card, rating }) => {
      const labels = [card.primary_level, ...card.scene_tags.map(scene => sceneLabels[scene] || scene)];
      labels.forEach(label => {
        const current = groups.get(label) || { total: 0, known: 0 };
        current.total += 1;
        if (rating === "known") current.known += 1;
        groups.set(label, current);
      });
    });
    elements.breakdown.replaceChildren();
    [...groups.entries()].forEach(([label, values]) => {
      const item = createElement("li", "");
      item.append(createElement("span", "", label), createElement("strong", "", `${values.known}/${values.total}枚を「覚えた」`));
      elements.breakdown.append(item);
    });

    const weak = entries.filter(entry => entry.rating !== "known");
    elements.weakList.replaceChildren();
    if (!weak.length) {
      elements.weakList.append(createElement("li", "", "苦手カードはありません。すべて「覚えた」で完了しました。"));
    } else {
      weak.forEach(({ card, rating }) => {
        const item = createElement("li", "");
        item.append(createElement("strong", "", card.display_de), createElement("span", "", `${card.japanese} — ${ratingLabels[rating]}`));
        elements.weakList.append(item);
      });
    }
    elements.reviewWeak.disabled = weak.length === 0;
    showOnly("results");
    elements.results.scrollIntoView({ block: "start" });
    elements.results.focus?.();
  }

  async function startWeakReview() {
    const weakIds = resultCards().filter(entry => entry.rating !== "known").map(entry => entry.card.card_id);
    if (!weakIds.length) return;
    state.session = createSession(weakIds, {
      direction: state.session.selected_direction,
      size: String(weakIds.length),
      order: "ordered"
    });
    await storage.putSession(state.session);
    openStudy();
  }

  function safeCsvValue(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }

  function downloadBlob(fileName, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadCsv() {
    if (!state.session || !state.currentDeck) return;
    const progress = new Map((await storage.getAllProgress()).map(entry => [entry.card_id, entry]));
    const columns = [
      "level", "deck", "german", "japanese", "unit_type", "part_of_speech", "grammar_info",
      "example_de", "example_ja", "result", "attempts", "known_count", "last_reviewed_at", "next_review_at"
    ];
    const rows = resultCards().map(({ card, rating }) => {
      const saved = progress.get(card.card_id) || {};
      return [
        card.primary_level,
        state.currentDeck.title_ja,
        card.display_de,
        card.japanese,
        card.unit_type,
        card.part_of_speech,
        formatGrammar(card),
        card.example_de,
        card.example_ja,
        rating,
        saved.attempts || 0,
        saved.known_count || 0,
        saved.last_reviewed || "",
        saved.next_review || ""
      ];
    });
    const csv = `\uFEFF${[columns, ...rows].map(row => row.map(safeCsvValue).join(",")).join("\r\n")}\r\n`;
    downloadBlob(`jconnect-${state.currentDeck.deck_id}-results.csv`, csv, "text/csv;charset=utf-8");
    showToast("Excelで開けるUTF-8 CSVを保存しました。");
  }

  async function downloadBackup() {
    const [progress, sessions] = await Promise.all([storage.getAllProgress(), storage.getAllSessions()]);
    const payload = {
      schema_version: BACKUP_SCHEMA_VERSION,
      source: "J-Connect Learn German flashcards",
      exported_at: new Date().toISOString(),
      progress,
      sessions
    };
    downloadBlob(
      `jconnect-flashcards-backup-${new Date().toISOString().slice(0, 10)}.json`,
      `${JSON.stringify(payload, null, 2)}\n`,
      "application/json;charset=utf-8"
    );
    showToast("学習記録のJSONバックアップを保存しました。");
  }

  function isFiniteNonNegative(value) {
    return Number.isFinite(Number(value)) && Number(value) >= 0;
  }

  function validateBackup(payload) {
    if (!payload || payload.schema_version !== BACKUP_SCHEMA_VERSION) throw new Error("対応していないバックアップ形式です。");
    if (!Array.isArray(payload.progress) || !Array.isArray(payload.sessions)) throw new Error("進捗またはセッションの配列がありません。");
    if (payload.progress.length > 12000 || payload.sessions.length > 500) throw new Error("バックアップの件数が上限を超えています。");
    const validStatuses = new Set(["unstarted", "reviewing", "mastered"]);
    payload.progress.forEach(entry => {
      if (!entry || !/^(?:a1|a2|b1|b2|c1|c2)-\d{3,4}$/.test(entry.card_id || "")) throw new Error("不正なカードIDが含まれています。");
      if (!validStatuses.has(entry.status)) throw new Error("不正な学習状態が含まれています。");
      if (entry.saved !== undefined && typeof entry.saved !== "boolean") throw new Error("不正な保存状態が含まれています。");
      for (const key of ["attempts", "known_count", "unsure_count", "again_count", "current_streak"]) {
        if (!isFiniteNonNegative(entry[key])) throw new Error(`不正な数値 ${key} が含まれています。`);
      }
    });
    const validDeckIds = new Set(state.decks.map(deck => deck.deck_id));
    payload.sessions.forEach(session => {
      if (!session || !validDeckIds.has(session.deck_id)) throw new Error("不明な教材のセッションが含まれています。");
      if (!Array.isArray(session.card_ids) || !session.card_ids.length || session.card_ids.length > 10000) throw new Error("不正なセッションカード一覧です。");
      if (session.card_ids.some(cardId => !/^(?:a1|a2|b1|b2|c1|c2)-\d{3,4}$/.test(cardId))) throw new Error("セッションに不正なカードIDがあります。");
      if (!Number.isInteger(session.last_session_position) || session.last_session_position < 0 || session.last_session_position >= session.card_ids.length) throw new Error("不正な再開位置です。");
      if (!session.ratings || typeof session.ratings !== "object" || Array.isArray(session.ratings)) throw new Error("不正な評価データです。");
      if (Object.values(session.ratings).some(value => !ratingLabels[value])) throw new Error("不正な評価値があります。");
    });
    return { progress: payload.progress, sessions: payload.sessions };
  }

  async function restoreBackup(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) throw new Error("バックアップファイルが大きすぎます（上限5MB）。");
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      throw new Error("JSONを読み取れませんでした。");
    }
    const valid = validateBackup(parsed);
    await storage.replaceAll(valid);
    showToast("学習記録を復元しました。画面を更新します。");
    window.setTimeout(() => window.location.reload(), 600);
  }

  async function resetAllProgress() {
    await storage.clearAll();
    state.session = null;
    state.restoredSession = null;
    state.inventoryController?.clearProgress();
    elements.resume.hidden = true;
    elements.resumeNote.hidden = true;
    showToast("この端末の学習記録をすべて削除しました。");
    if (state.currentDeck) showOnly("setup");
    else showOnly("picker");
  }

  function openResetDialog() {
    if (typeof elements.resetDialog.showModal === "function") {
      elements.resetDialog.showModal();
      return;
    }
    if (window.confirm("すべての学習記録を削除しますか？この操作は元に戻せません。")) resetAllProgress();
  }

  function bindEvents() {
    elements.start.addEventListener("click", startNewSession);
    elements.resume.addEventListener("click", resumeSession);
    elements.chooseAnother.addEventListener("click", () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("deck");
      window.history.pushState({}, "", url);
      elements.inventory.hidden = true;
      showOnly("picker");
      elements.picker.scrollIntoView({ block: "start" });
    });
    elements.flip.addEventListener("click", event => {
      if (event.target.closest("#flashcardsSpeakExample")) return;
      setFlipped(!state.isFlipped);
    });
    elements.detailsToggle.addEventListener("click", () => setDetailsExpanded(elements.detailsToggle.getAttribute("aria-expanded") !== "true"));
    elements.ratingButtons.forEach(button => button.addEventListener("click", () => rateCurrentCard(button.dataset.rating)));
    elements.previous.addEventListener("click", () => moveCard(-1));
    elements.next.addEventListener("click", () => moveCard(1));
    elements.endSession.addEventListener("click", pauseSession);
    elements.speak.addEventListener("click", speakCurrentCard);
    elements.speakExample.addEventListener("click", event => {
      event.stopPropagation();
      speakCurrentExample();
    });
    elements.reviewWeak.addEventListener("click", startWeakReview);
    elements.restart.addEventListener("click", startNewSession);
    elements.downloadCsv.addEventListener("click", downloadCsv);
    elements.backup.addEventListener("click", downloadBackup);
    elements.restore.addEventListener("change", async () => {
      try {
        await restoreBackup(elements.restore.files?.[0]);
      } catch (error) {
        showToast(error.message || "バックアップを復元できませんでした。");
      } finally {
        elements.restore.value = "";
      }
    });
    elements.reset.addEventListener("click", openResetDialog);
    elements.confirmReset.addEventListener("click", resetAllProgress);
    window.addEventListener("popstate", () => {
      const deckId = new URL(window.location.href).searchParams.get("deck");
      if (deckId) selectDeck(deckId);
      else {
        elements.inventory.hidden = true;
        showOnly("picker");
      }
    });
    document.addEventListener("keydown", event => {
      if (elements.study.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
      const interactive = event.target.closest("input, select, textarea, button, a, [contenteditable='true']");
      if (interactive) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setFlipped(!state.isFlipped);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveCard(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveCard(1);
      } else if (["1", "2", "3"].includes(event.key) && state.isFlipped) {
        event.preventDefault();
        rateCurrentCard({ 1: "again", 2: "unsure", 3: "known" }[event.key]);
      }
    });
  }

  async function initialize() {
    if (!storage) {
      showError("このブラウザでは学習記録の保存機能を初期化できませんでした。");
      return;
    }
    bindEvents();
    configureSpeech();
    try {
      const response = await fetch(DECKS_URL, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`Deck data request failed (${response.status}).`);
      const payload = await response.json();
      if (![1, 2].includes(payload.schema_version) || !Array.isArray(payload.decks)) throw new Error("Unsupported deck data schema.");
      state.payload = payload;
      state.decks = payload.decks;
      renderDeckPicker();
      elements.loading.hidden = true;
      const requestedDeck = new URL(window.location.href).searchParams.get("deck");
      if (requestedDeck) await selectDeck(requestedDeck);
      else showOnly("picker");
    } catch (error) {
      showError("教材情報を読み込めませんでした。通信状況を確認して再読み込みしてください。", error);
    }
  }

  initialize();
})();
