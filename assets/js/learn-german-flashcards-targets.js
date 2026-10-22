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

  // 学習対象とは別に、カードの属性（レベル・品詞・場面）で出題範囲を絞る欄。
  // cardFacets(cardId) は { level: "A1", pos: "noun", scene: ["daily", ...] } を返す。
  const facets = [
    { key: "level", input: "session-level", fieldset: "#flashcardsStudyLevels", kinds: ["cefr-all"] },
    { key: "pos", input: "session-pos", fieldset: "#flashcardsStudyPartsOfSpeech", kinds: ["cefr-all", "cefr-level"] },
    { key: "scene", input: "session-scene", fieldset: "#flashcardsStudyScenes", kinds: ["cefr-all", "cefr-level"] }
  ];

  function create({ root, storage, emptyProgress, selectedValue, cardFacets }) {
    const inputs = Array.from(root.querySelectorAll('input[name="session-target"]'));
    const facetInputs = new Map(facets.map(facet => [facet.key, Array.from(root.querySelectorAll(`input[name="${facet.input}"]`))]));
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

    function facetEnabled(facet) {
      return facet.kinds.includes(deck?.deck_kind);
    }

    function selectedFacets() {
      return Object.fromEntries(facets.map(facet => [facet.key, facetEnabled(facet) ? selectedValue(facet.input) || "all" : "all"]));
    }

    function facetMatches(values, selection) {
      return facets.every(facet => {
        const wanted = selection[facet.key];
        if (wanted === "all") return true;
        const value = values[facet.key];
        return Array.isArray(value) ? value.includes(wanted) : value === wanted;
      });
    }

    function cardIds(target = selectedValue("session-target") || "all", selection = selectedFacets()) {
      if (!deck) return [];
      return deck.card_ids.filter(cardId => facetMatches(cardFacets(cardId), selection)
        && matches(progressByCardId.get(cardId) || emptyProgress(cardId), target));
    }

    function setCount(attribute, value, count) {
      root.querySelector(`[${attribute}="${CSS.escape(value)}"]`).textContent = `${count.toLocaleString("ja-JP")}項目`;
    }

    function render() {
      if (!deck) return;
      const selection = selectedFacets();
      const target = selectedValue("session-target") || "all";
      facets.forEach(facet => {
        root.querySelector(facet.fieldset).hidden = !facetEnabled(facet);
        if (!facetEnabled(facet)) return;
        facetInputs.get(facet.key).forEach(input => {
          const count = cardIds(target, { ...selection, [facet.key]: input.value }).length;
          setCount("data-study-facet-count", `${facet.key}:${input.value}`, count);
          input.disabled = input.value !== "all" && count === 0 && !input.checked;
        });
      });
      const counts = new Map(inputs.map(input => {
        const count = cardIds(input.value, selection).length;
        setCount("data-study-target-count", input.value, count);
        input.disabled = input.value !== "all" && count === 0 && !input.checked;
        return [input.value, count];
      }));
      const available = counts.get(target) || 0;
      const sizeValue = selectedValue("session-size") || "10";
      const size = sizeValue === "all" ? available : Math.min(Number(sizeValue), available);
      const order = selectedValue("session-order") === "shuffle" ? "シャッフル" : "収録順";
      const direction = selectedValue("session-direction") === "ja-de" ? "日→独" : "独→日";
      const facetLabels = facets
        .filter(facet => selection[facet.key] !== "all")
        .map(facet => facetInputs.get(facet.key).find(input => input.checked)?.dataset.label || selection[facet.key]);
      const scope = [...facetLabels, labels[target]].join("・");
      summary.textContent = available
        ? `${scope} ${available.toLocaleString("ja-JP")}項目から${size.toLocaleString("ja-JP")}枚を、${order}・${direction}で出題します。`
        : `${scope}に該当するカードはまだありません。別の条件を選んでください。`;
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
      selectedFacets,
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
