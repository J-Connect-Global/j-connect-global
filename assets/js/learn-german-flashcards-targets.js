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

  function create({ root, storage, emptyProgress, selectedValue }) {
    const inputs = Array.from(root.querySelectorAll('input[name="session-target"]'));
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

    function cardIds(target = selectedValue("session-target") || "all") {
      if (!deck) return [];
      return deck.card_ids.filter(cardId => matches(progressByCardId.get(cardId) || emptyProgress(cardId), target));
    }

    function render() {
      if (!deck) return;
      const counts = new Map(inputs.map(input => {
        const count = cardIds(input.value).length;
        root.querySelector(`[data-study-target-count="${CSS.escape(input.value)}"]`).textContent = `${count.toLocaleString("ja-JP")}語`;
        input.disabled = input.value !== "all" && count === 0 && !input.checked;
        return [input.value, count];
      }));
      const target = selectedValue("session-target") || "all";
      const available = counts.get(target) || 0;
      const sizeValue = selectedValue("session-size") || "10";
      const size = sizeValue === "all" ? available : Math.min(Number(sizeValue), available);
      const order = selectedValue("session-order") === "shuffle" ? "シャッフル" : "収録順";
      const direction = selectedValue("session-direction") === "ja-de" ? "日→独" : "独→日";
      summary.textContent = available
        ? `${labels[target]} ${available.toLocaleString("ja-JP")}語から${size.toLocaleString("ja-JP")}枚を、${order}・${direction}で出題します。`
        : `${labels[target]}に該当するカードはまだありません。別の学習対象を選んでください。`;
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
