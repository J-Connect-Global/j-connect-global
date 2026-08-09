(function exposeFlashcardInventory() {
  "use strict";

  function createInventoryController(options) {
    const {
      root,
      storage,
      partOfSpeechLabels,
      formatGrammar,
      formatDate,
      safeCsvValue,
      downloadBlob,
      showToast,
      onProgressChange,
      startSession
    } = options;
    const elements = {
      section: root.querySelector("#flashcardsInventory"),
      title: root.querySelector("#flashcardsInventoryTitle"),
      description: root.querySelector("#flashcardsInventoryDescription"),
      search: root.querySelector("#flashcardsInventorySearch"),
      status: root.querySelector("#flashcardsInventoryStatus"),
      saved: root.querySelector("#flashcardsInventorySaved"),
      partOfSpeech: root.querySelector("#flashcardsInventoryPartOfSpeech"),
      quality: root.querySelector("#flashcardsInventoryQuality"),
      pageSize: root.querySelector("#flashcardsInventoryPageSize"),
      reset: root.querySelector("#flashcardsInventoryReset"),
      studyFiltered: root.querySelector("#flashcardsInventoryStudyFiltered"),
      csv: root.querySelector("#flashcardsInventoryCsv"),
      summary: root.querySelector("#flashcardsInventorySummary"),
      tableWrap: root.querySelector(".flashcards-inventory-table-wrap"),
      body: root.querySelector("#flashcardsInventoryBody"),
      empty: root.querySelector("#flashcardsInventoryEmpty"),
      first: root.querySelector("#flashcardsInventoryFirst"),
      previous: root.querySelector("#flashcardsInventoryPrevious"),
      next: root.querySelector("#flashcardsInventoryNext"),
      last: root.querySelector("#flashcardsInventoryLast"),
      pageStatus: root.querySelector("#flashcardsInventoryPageStatus"),
      sortButtons: Array.from(root.querySelectorAll("[data-inventory-sort]"))
    };
    const state = {
      deck: null,
      cardsById: new Map(),
      progressByCardId: new Map(),
      query: "",
      status: "all",
      saved: "all",
      partOfSpeech: "all",
      quality: "all",
      sortKey: "order",
      sortDirection: "asc",
      page: 1,
      pageSize: "50",
      filteredEntries: []
    };

    function createElement(tagName, className, text) {
      const element = document.createElement(tagName);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
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

    function progressFor(cardId) {
      return state.progressByCardId.get(cardId) || emptyProgress(cardId);
    }

    function isReviewDue(progress) {
      if (!progress?.next_review || progress.status === "unstarted") return false;
      const nextReview = new Date(progress.next_review).getTime();
      return Number.isFinite(nextReview) && nextReview <= Date.now();
    }

    function normalizedSearchText(value) {
      return String(value || "").normalize("NFKC").toLocaleLowerCase("de-DE");
    }

    function resetState() {
      Object.assign(state, {
        query: "",
        status: "all",
        saved: "all",
        partOfSpeech: "all",
        quality: "all",
        sortKey: "order",
        sortDirection: "asc",
        page: 1,
        pageSize: "50",
        filteredEntries: []
      });
      elements.search.value = "";
      elements.status.value = "all";
      elements.saved.value = "all";
      elements.quality.value = "all";
      elements.pageSize.value = "50";
    }

    function populatePartOfSpeechFilter() {
      const values = [...new Set([...state.cardsById.values()].map(card => card.part_of_speech).filter(Boolean))]
        .sort((left, right) => (partOfSpeechLabels[left] || left).localeCompare(partOfSpeechLabels[right] || right, "ja"));
      elements.partOfSpeech.replaceChildren(new Option("すべて", "all"));
      values.forEach(value => elements.partOfSpeech.append(new Option(partOfSpeechLabels[value] || value, value)));
      elements.partOfSpeech.value = "all";
    }

    function statusLabel(progress) {
      if (progress.status === "mastered") return "習得済み";
      if (progress.status === "reviewing") return "学習中";
      return "未学習";
    }

    function qualityLabel(card) {
      return card.quality_tier === "editorial-reviewed" ? "例文・解説あり" : "参照カード";
    }

    function filteredEntries() {
      const query = normalizedSearchText(state.query);
      const statusOrder = { unstarted: 0, reviewing: 1, mastered: 2 };
      const entries = [...state.cardsById.values()].map((card, index) => ({
        card,
        order: index + 1,
        progress: progressFor(card.card_id)
      })).filter(({ card, progress }) => {
        if (query) {
          const searchable = normalizedSearchText([
            card.display_de,
            card.lemma,
            card.japanese,
            card.example_de,
            card.example_ja,
            formatGrammar(card),
            ...(card.collocations || []),
            ...(card.related_terms || [])
          ].join(" "));
          if (!searchable.includes(query)) return false;
        }
        if (state.status === "due") {
          if (!isReviewDue(progress)) return false;
        } else if (state.status !== "all" && progress.status !== state.status) {
          return false;
        }
        if (state.saved === "saved" && !progress.saved) return false;
        if (state.saved === "unsaved" && progress.saved) return false;
        if (state.partOfSpeech !== "all" && card.part_of_speech !== state.partOfSpeech) return false;
        if (state.quality !== "all" && card.quality_tier !== state.quality) return false;
        return true;
      });

      const collator = new Intl.Collator(state.sortKey === "display_de" ? "de" : "ja", { numeric: true, sensitivity: "base" });
      const direction = state.sortDirection === "desc" ? -1 : 1;
      entries.sort((left, right) => {
        let comparison = 0;
        switch (state.sortKey) {
          case "saved": comparison = Number(left.progress.saved) - Number(right.progress.saved); break;
          case "display_de": comparison = collator.compare(left.card.display_de, right.card.display_de); break;
          case "japanese": comparison = collator.compare(left.card.japanese, right.card.japanese); break;
          case "example": comparison = collator.compare(left.card.example_de || "", right.card.example_de || ""); break;
          case "part_of_speech": comparison = collator.compare(partOfSpeechLabels[left.card.part_of_speech] || left.card.part_of_speech, partOfSpeechLabels[right.card.part_of_speech] || right.card.part_of_speech); break;
          case "quality": comparison = collator.compare(qualityLabel(left.card), qualityLabel(right.card)); break;
          case "status": comparison = statusOrder[left.progress.status] - statusOrder[right.progress.status]; break;
          default: comparison = left.order - right.order;
        }
        return (comparison || left.order - right.order) * direction;
      });
      return entries;
    }

    function appendCell(row, content) {
      const cell = document.createElement("td");
      if (content instanceof Node) cell.append(content);
      else cell.textContent = content;
      row.append(cell);
      return cell;
    }

    function createRow(entry) {
      const { card, order, progress } = entry;
      const row = document.createElement("tr");
      const saveButton = createElement("button", "flashcards-inventory-save", progress.saved ? "★" : "☆");
      saveButton.type = "button";
      saveButton.dataset.inventorySave = card.card_id;
      saveButton.setAttribute("aria-pressed", progress.saved ? "true" : "false");
      saveButton.setAttribute("aria-label", `${card.display_de}を${progress.saved ? "保存から外す" : "保存する"}`);
      appendCell(row, saveButton);
      appendCell(row, String(order));

      const german = document.createElement("div");
      german.append(createElement("span", "flashcards-inventory-word", card.display_de));
      if (card.lemma && card.lemma !== card.display_de) german.append(createElement("span", "flashcards-inventory-subtext", `見出し語: ${card.lemma}`));
      appendCell(row, german);
      appendCell(row, card.japanese);

      const example = document.createElement("div");
      example.append(createElement("span", "", card.example_de || "例文は編集レビュー待ちです。"));
      example.append(createElement("span", "flashcards-inventory-example-ja", card.example_ja || "日本語例文は編集レビュー待ちです。"));
      appendCell(row, example);

      const grammar = document.createElement("div");
      grammar.append(createElement("span", "flashcards-inventory-badge", partOfSpeechLabels[card.part_of_speech] || card.part_of_speech));
      grammar.append(createElement("span", "flashcards-inventory-subtext", formatGrammar(card)));
      appendCell(row, grammar);
      appendCell(row, createElement("span", "flashcards-inventory-badge", qualityLabel(card)));

      const progressCell = document.createElement("div");
      progressCell.append(createElement("span", `flashcards-inventory-badge is-${progress.status}`, statusLabel(progress)));
      if (isReviewDue(progress)) progressCell.append(createElement("span", "flashcards-inventory-badge is-due", "復習期限"));
      if (Number(progress.attempts || 0) > 0) {
        progressCell.append(createElement("span", "flashcards-inventory-subtext", `学習 ${Number(progress.attempts).toLocaleString("ja-JP")}回・覚えた ${Number(progress.known_count || 0).toLocaleString("ja-JP")}回`));
      }
      const reviewed = formatDate(progress.last_reviewed);
      if (reviewed) progressCell.append(createElement("span", "flashcards-inventory-subtext", `最終学習: ${reviewed}`));
      const nextReview = formatDate(progress.next_review);
      if (nextReview) progressCell.append(createElement("span", "flashcards-inventory-subtext", `次回復習: ${nextReview}`));
      appendCell(row, progressCell);
      return row;
    }

    function renderSortState() {
      elements.sortButtons.forEach(button => {
        const selected = button.dataset.inventorySort === state.sortKey;
        const heading = button.closest("th");
        heading.removeAttribute("aria-sort");
        if (selected) heading.setAttribute("aria-sort", state.sortDirection === "asc" ? "ascending" : "descending");
        const indicator = button.querySelector("span");
        if (indicator) indicator.textContent = selected ? (state.sortDirection === "asc" ? "↑" : "↓") : "↕";
      });
    }

    function render() {
      if (!state.deck) return;
      const entries = filteredEntries();
      state.filteredEntries = entries;
      const pageSize = state.pageSize === "all" ? Math.max(entries.length, 1) : Number(state.pageSize);
      const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
      state.page = Math.min(Math.max(state.page, 1), pageCount);
      const start = (state.page - 1) * pageSize;
      const visible = entries.slice(start, start + pageSize);
      const fragment = document.createDocumentFragment();
      visible.forEach(entry => fragment.append(createRow(entry)));
      elements.body.replaceChildren(fragment);

      const allProgress = [...state.cardsById.keys()].map(progressFor);
      const counts = {
        unstarted: allProgress.filter(progress => progress.status === "unstarted").length,
        reviewing: allProgress.filter(progress => progress.status === "reviewing").length,
        mastered: allProgress.filter(progress => progress.status === "mastered").length,
        saved: allProgress.filter(progress => progress.saved).length
      };
      const total = state.cardsById.size;
      const rangeText = entries.length ? `${start + 1}〜${start + visible.length}件目` : "0件";
      elements.summary.textContent = `${entries.length.toLocaleString("ja-JP")} / ${total.toLocaleString("ja-JP")}語（${rangeText}）｜未学習 ${counts.unstarted.toLocaleString("ja-JP")}・学習中 ${counts.reviewing.toLocaleString("ja-JP")}・習得済み ${counts.mastered.toLocaleString("ja-JP")}・保存済み ${counts.saved.toLocaleString("ja-JP")}`;
      elements.empty.hidden = entries.length !== 0;
      elements.tableWrap.hidden = entries.length === 0;
      elements.pageStatus.textContent = `${state.page.toLocaleString("ja-JP")} / ${pageCount.toLocaleString("ja-JP")}ページ`;
      elements.first.disabled = state.page <= 1;
      elements.previous.disabled = state.page <= 1;
      elements.next.disabled = state.page >= pageCount;
      elements.last.disabled = state.page >= pageCount;
      elements.studyFiltered.disabled = entries.length === 0;
      elements.csv.disabled = entries.length === 0;
      renderSortState();
    }

    async function prepare(deck, cardsById) {
      state.deck = deck;
      state.cardsById = cardsById;
      resetState();
      populatePartOfSpeechFilter();
      const allProgress = await storage.getAllProgress();
      state.progressByCardId = new Map(allProgress.map(progress => [progress.card_id, progress]));
      elements.title.textContent = `${deck.target_level}・全${Number(deck.card_count).toLocaleString("ja-JP")}語リスト`;
      elements.description.textContent = `${deck.target_level}だけに割り当てた語彙の表・裏・例文・文法・品質・端末内学習進捗です。見出しをクリックすると昇順・降順を切り替えられます。`;
      elements.section.hidden = false;
      render();
    }

    async function toggleSaved(cardId) {
      if (!state.cardsById.has(cardId)) return;
      const previous = progressFor(cardId);
      const progress = { ...previous, saved: !previous.saved };
      await storage.putProgress(progress);
      state.progressByCardId.set(cardId, progress);
      onProgressChange?.(progress);
      render();
      showToast(progress.saved ? "単語を保存しました。" : "単語を保存から外しました。");
    }

    function downloadCsv() {
      if (!state.deck || !state.filteredEntries.length) return;
      const columns = [
        "order", "saved", "level", "german", "lemma", "japanese", "example_de", "example_ja",
        "part_of_speech", "grammar_info", "quality", "status", "attempts", "last_reviewed_at", "next_review_at"
      ];
      const rows = state.filteredEntries.map(({ card, order, progress }) => [
        order,
        progress.saved ? "yes" : "no",
        card.primary_level,
        card.display_de,
        card.lemma,
        card.japanese,
        card.example_de,
        card.example_ja,
        card.part_of_speech,
        formatGrammar(card),
        card.quality_tier,
        progress.status,
        progress.attempts || 0,
        progress.last_reviewed || "",
        progress.next_review || ""
      ]);
      const csv = `\uFEFF${[columns, ...rows].map(row => row.map(safeCsvValue).join(",")).join("\r\n")}\r\n`;
      downloadBlob(`jconnect-${state.deck.deck_id}-all-words.csv`, csv, "text/csv;charset=utf-8");
      showToast(`${rows.length.toLocaleString("ja-JP")}語の一覧CSVを保存しました。`);
    }

    elements.search.addEventListener("input", () => {
      state.query = elements.search.value.trim();
      state.page = 1;
      render();
    });
    [
      [elements.status, "status"],
      [elements.saved, "saved"],
      [elements.partOfSpeech, "partOfSpeech"],
      [elements.quality, "quality"],
      [elements.pageSize, "pageSize"]
    ].forEach(([control, key]) => control.addEventListener("change", () => {
      state[key] = control.value;
      state.page = 1;
      render();
    }));
    elements.reset.addEventListener("click", () => {
      resetState();
      populatePartOfSpeechFilter();
      render();
      elements.search.focus();
    });
    elements.sortButtons.forEach(button => button.addEventListener("click", () => {
      const sortKey = button.dataset.inventorySort;
      if (state.sortKey === sortKey) state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      else {
        state.sortKey = sortKey;
        state.sortDirection = "asc";
      }
      state.page = 1;
      render();
    }));
    elements.body.addEventListener("click", event => {
      const button = event.target.closest("[data-inventory-save]");
      if (!button) return;
      toggleSaved(button.dataset.inventorySave).catch(error => {
        console.error(error);
        showToast("保存状態を更新できませんでした。");
      });
    });
    elements.first.addEventListener("click", () => { state.page = 1; render(); });
    elements.previous.addEventListener("click", () => { state.page -= 1; render(); });
    elements.next.addEventListener("click", () => { state.page += 1; render(); });
    elements.last.addEventListener("click", () => {
      const pageSize = state.pageSize === "all" ? Math.max(state.filteredEntries.length, 1) : Number(state.pageSize);
      state.page = Math.max(1, Math.ceil(state.filteredEntries.length / pageSize));
      render();
    });
    elements.studyFiltered.addEventListener("click", () => startSession(state.filteredEntries.map(entry => entry.card.card_id)));
    elements.csv.addEventListener("click", downloadCsv);

    return {
      prepare,
      hide() {
        state.deck = null;
        elements.section.hidden = true;
      },
      setProgress(progress) {
        state.progressByCardId.set(progress.card_id, progress);
        if (!elements.section.hidden) render();
      },
      clearProgress() {
        state.progressByCardId.clear();
        if (!elements.section.hidden) render();
      }
    };
  }

  window.JConnectFlashcardInventory = { create: createInventoryController };
})();
