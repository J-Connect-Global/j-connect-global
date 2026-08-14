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
      pageSize: root.querySelector("#flashcardsInventoryPageSize"),
      levelFilter: root.querySelector("#flashcardsInventoryLevelFilter"),
      levelChips: root.querySelector("#flashcardsInventoryLevelChips"),
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
      availableLevels: [],
      selectedLevels: new Set(),
      sortKey: "order",
      sortDirection: "asc",
      page: 1,
      pageSize: "25",
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
        sortKey: "order",
        sortDirection: "asc",
        page: 1,
        pageSize: "25",
        filteredEntries: []
      });
      state.selectedLevels = new Set(state.availableLevels);
      elements.search.value = "";
      elements.status.value = "all";
      elements.saved.value = "all";
      elements.pageSize.value = "25";
    }

    function populatePartOfSpeechFilter() {
      const values = [...new Set([...state.cardsById.values()].map(card => card.part_of_speech).filter(Boolean))]
        .sort((left, right) => (partOfSpeechLabels[left] || left).localeCompare(partOfSpeechLabels[right] || right, "ja"));
      elements.partOfSpeech.replaceChildren(new Option("すべて", "all"));
      values.forEach(value => elements.partOfSpeech.append(new Option(partOfSpeechLabels[value] || value, value)));
      elements.partOfSpeech.value = "all";
    }

    function populateLevelFilter() {
      elements.levelChips.replaceChildren();
      elements.levelFilter.hidden = state.availableLevels.length <= 1;
      if (state.availableLevels.length <= 1) return;
      state.availableLevels.forEach(level => {
        const label = createElement("label", "flashcards-level-chip");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = level;
        input.checked = state.selectedLevels.has(level);
        const count = [...state.cardsById.values()].filter(card => card.primary_level === level).length;
        const text = createElement("span", "", level);
        text.append(createElement("small", "", `${count.toLocaleString("ja-JP")}枚`));
        label.append(input, text);
        elements.levelChips.append(label);
        input.addEventListener("change", () => {
          const checked = Array.from(elements.levelChips.querySelectorAll("input:checked"));
          if (!checked.length) {
            input.checked = true;
            showToast("表示するレベルを1つ以上選んでください。");
            return;
          }
          state.selectedLevels = new Set(checked.map(item => item.value));
          state.page = 1;
          render();
        });
      });
    }

    function statusLabel(progress) {
      if (progress.status === "mastered") return "習得済み";
      if (progress.status === "reviewing") return "学習中";
      return "未学習";
    }

    function filteredEntries() {
      const query = normalizedSearchText(state.query);
      const statusOrder = { unstarted: 0, reviewing: 1, mastered: 2 };
      const entries = [...state.cardsById.values()].map((card, index) => ({
        card,
        order: index + 1,
        progress: progressFor(card.card_id)
      })).filter(({ card, progress }) => {
        if (!state.selectedLevels.has(card.primary_level)) return false;
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
        return true;
      });

      const collator = new Intl.Collator(state.sortKey === "display_de" ? "de" : "ja", { numeric: true, sensitivity: "base" });
      const direction = state.sortDirection === "desc" ? -1 : 1;
      entries.sort((left, right) => {
        let comparison = 0;
        switch (state.sortKey) {
          case "saved": comparison = Number(left.progress.saved) - Number(right.progress.saved); break;
          case "level": comparison = left.card.primary_level.localeCompare(right.card.primary_level, "de", { numeric: true }); break;
          case "display_de": comparison = collator.compare(left.card.display_de, right.card.display_de); break;
          case "japanese": comparison = collator.compare(left.card.japanese, right.card.japanese); break;
          case "example": comparison = collator.compare(left.card.example_de || "", right.card.example_de || ""); break;
          case "part_of_speech": comparison = collator.compare(partOfSpeechLabels[left.card.part_of_speech] || left.card.part_of_speech, partOfSpeechLabels[right.card.part_of_speech] || right.card.part_of_speech); break;
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

    function shortDate(value) {
      if (!value) return "";
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ja-JP", {
        timeZone: "Europe/Berlin",
        month: "numeric",
        day: "numeric"
      });
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
      appendCell(row, createElement("span", `flashcards-inventory-level is-${card.primary_level.toLowerCase()}`, card.primary_level));

      const german = document.createElement("div");
      german.append(createElement("span", "flashcards-inventory-word", card.display_de));
      appendCell(row, german);
      appendCell(row, card.japanese);

      const example = createElement("div", "flashcards-inventory-example");
      const exampleDe = createElement("span", "", card.example_de);
      const exampleJa = createElement("span", "flashcards-inventory-example-ja", card.example_ja);
      example.title = `${card.example_de}\n${card.example_ja}`;
      example.append(exampleDe, exampleJa);
      appendCell(row, example);

      const grammar = createElement("div", "flashcards-inventory-grammar");
      grammar.append(createElement("span", "flashcards-inventory-badge", partOfSpeechLabels[card.part_of_speech] || card.part_of_speech));
      const grammarText = formatGrammar(card);
      const grammarDetails = createElement("span", "flashcards-inventory-subtext", grammarText);
      grammarDetails.title = grammarText;
      grammar.append(grammarDetails);
      appendCell(row, grammar);

      const progressCell = createElement("div", "flashcards-inventory-progress");
      progressCell.append(createElement("span", `flashcards-inventory-badge is-${progress.status}`, statusLabel(progress)));
      if (isReviewDue(progress)) progressCell.append(createElement("span", "flashcards-inventory-badge is-due", "復習期限"));
      if (Number(progress.attempts || 0) > 0) {
        const reviewed = shortDate(progress.last_reviewed);
        const compact = [`${Number(progress.attempts).toLocaleString("ja-JP")}回`, reviewed ? `最終 ${reviewed}` : ""].filter(Boolean).join(" · ");
        const meta = createElement("span", "flashcards-inventory-subtext", compact);
        const nextReview = formatDate(progress.next_review);
        meta.title = [`学習 ${Number(progress.attempts).toLocaleString("ja-JP")}回`, `覚えた ${Number(progress.known_count || 0).toLocaleString("ja-JP")}回`, formatDate(progress.last_reviewed) ? `最終学習: ${formatDate(progress.last_reviewed)}` : "", nextReview ? `次回復習: ${nextReview}` : ""].filter(Boolean).join("\n");
        progressCell.append(meta);
      }
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

      const selectedIds = [...state.cardsById.values()]
        .filter(card => state.selectedLevels.has(card.primary_level))
        .map(card => card.card_id);
      const allProgress = selectedIds.map(progressFor);
      const counts = {
        unstarted: allProgress.filter(progress => progress.status === "unstarted").length,
        reviewing: allProgress.filter(progress => progress.status === "reviewing").length,
        mastered: allProgress.filter(progress => progress.status === "mastered").length,
        saved: allProgress.filter(progress => progress.saved).length
      };
      const total = selectedIds.length;
      const rangeText = entries.length ? `${start + 1}〜${start + visible.length}件目` : "0件";
      elements.summary.replaceChildren();
      [["表示", `${entries.length.toLocaleString("ja-JP")} / ${total.toLocaleString("ja-JP")}枚`], ["範囲", rangeText], ["未学習", counts.unstarted], ["学習中", counts.reviewing], ["習得済み", counts.mastered], ["保存", counts.saved]].forEach(([label, value], index) => {
        const item = createElement("span", index < 2 ? "is-summary" : "");
        item.append(createElement("small", "", label), createElement("strong", "", String(value).replace(/^(\d+)$/, (_, number) => Number(number).toLocaleString("ja-JP"))));
        elements.summary.append(item);
      });
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
      state.availableLevels = [...new Set([...cardsById.values()].map(card => card.primary_level))]
        .sort((left, right) => left.localeCompare(right, "de", { numeric: true }));
      resetState();
      populatePartOfSpeechFilter();
      populateLevelFilter();
      const allProgress = await storage.getAllProgress();
      state.progressByCardId = new Map(allProgress.map(progress => [progress.card_id, progress]));
      elements.title.textContent = `${deck.target_level}・全${Number(deck.card_count).toLocaleString("ja-JP")}枚のカード一覧`;
      elements.description.textContent = "ドイツ語、日本語、例文、文法、端末内の学習進捗を確認できます。列見出しを押すと並び順を変更できます。";
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
        "part_of_speech", "grammar_info", "status", "attempts", "last_reviewed_at", "next_review_at"
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
      [elements.pageSize, "pageSize"]
    ].forEach(([control, key]) => control.addEventListener("change", () => {
      state[key] = control.value;
      state.page = 1;
      render();
    }));
    elements.reset.addEventListener("click", () => {
      resetState();
      populatePartOfSpeechFilter();
      populateLevelFilter();
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
