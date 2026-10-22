(function initializeFlashcardTargets() {
  "use strict";

  const labels = {
    all: "すべて",
    unstarted: "未学習",
    studied: "学習済み",
    again: "もう一度",
    unsure: "迷った",
    known: "覚えた",
    due: "復習期限",
    saved: "保存済み"
  };

  function create({ root, storage, emptyProgress, selectedValue, cardLevel }) {
    const inputs = Array.from(root.querySelectorAll('input[name="session-target"]'));
    const levelFieldset = root.querySelector("#flashcardsStudyLevels");
    const levelInputs = Array.from(root.querySelectorAll('input[name="session-level"]'));
    const summary = root.querySelector("#flashcardsStartSummary");
    const start = root.querySelector("#flashcardsStart");
    let deck = null;
    let progressByCardId = new Map();

    function matches(progress, target) {
      if (target === "unstarted") return progress.status === "unstarted";
      if (target === "studied") return Number(progress.attempts || 0) > 0;
      if (["again", "unsure", "known"].includes(target)) return progress.last_result === target;
      if (target === "saved") return Boolean(progress.saved);
      if (target !== "due") return true;
      const dueAt = new Date(progress.next_review || "").getTime();
      return progress.status !== "unstarted" && Number.isFinite(dueAt) && dueAt <= Date.now();
    }

    function levelSelectable() {
      return deck?.deck_kind === "cefr-all";
    }

    function selectedLevel() {
      return levelSelectable() ? selectedValue("session-level") || "all" : "all";
    }

    function cardIds(target = selectedValue("session-target") || "all", level = selectedLevel()) {
      if (!deck) return [];
      return deck.card_ids.filter(cardId => (level === "all" || cardLevel(cardId) === level)
        && matches(progressByCardId.get(cardId) || emptyProgress(cardId), target));
    }

    function render() {
      if (!deck) return;
      levelFieldset.hidden = !levelSelectable();
      const level = selectedLevel();
      if (levelSelectable()) {
        const target = selectedValue("session-target") || "all";
        levelInputs.forEach(input => {
          const count = cardIds(target, input.value).length;
          root.querySelector(`[data-study-level-count="${CSS.escape(input.value)}"]`).textContent = `${count.toLocaleString("ja-JP")}項目`;
          input.disabled = input.value !== "all" && count === 0 && !input.checked;
        });
      }
      const counts = new Map(inputs.map(input => {
        const count = cardIds(input.value, level).length;
        root.querySelector(`[data-study-target-count="${CSS.escape(input.value)}"]`).textContent = `${count.toLocaleString("ja-JP")}項目`;
        input.disabled = input.value !== "all" && count === 0 && !input.checked;
        return [input.value, count];
      }));
      const target = selectedValue("session-target") || "all";
      const available = counts.get(target) || 0;
      const sizeValue = selectedValue("session-size") || "10";
      const size = sizeValue === "all" ? available : Math.min(Number(sizeValue), available);
      const order = selectedValue("session-order") === "shuffle" ? "シャッフル" : "収録順";
      const direction = selectedValue("session-direction") === "ja-de" ? "日→独" : "独→日";
      const scope = level === "all" ? labels[target] : `${level}・${labels[target]}`;
      summary.textContent = available
        ? `${scope} ${available.toLocaleString("ja-JP")}項目から${size.toLocaleString("ja-JP")}枚を、${order}・${direction}で出題します。`
        : `${scope}に該当するカードはまだありません。別の学習対象を選んでください。`;
      start.disabled = available === 0;
    }

    async function refresh() {
      progressByCardId = new Map((await storage.getAllProgress()).map(progress => [progress.card_id, progress]));
      render();
    }

    return {
      async prepare(nextDeck) {
        deck = nextDeck;
        await refresh();
      },
      refresh,
      render,
      cardIds,
      selectedLevel,
      setProgress(progress) {
        progressByCardId.set(progress.card_id, progress);
        render();
      },
      clear() {
        progressByCardId.clear();
        render();
      }
    };
  }

  window.JConnectFlashcardTargets = { create };
})();
