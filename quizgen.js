/*
 * QuizGen — builds multiple-choice distractors for a deck's cards
 * entirely client-side (no network, no API keys). Cards themselves are
 * written by hand; this just picks plausible wrong answers for MCQ mode
 * by pulling from the other cards' own answers in the same deck.
 */
(function (global) {
  function levenshteinClose(a, b) {
    // cheap similarity heuristic for plausible distractors: similar length
    return Math.abs(a.length - b.length) <= 4;
  }

  function buildDistractors(correctAnswer, pool, count) {
    const correctLower = correctAnswer.toLowerCase();
    let candidates = pool.filter(
      (w) => w.toLowerCase() !== correctLower && levenshteinClose(w, correctAnswer)
    );
    if (candidates.length < count) {
      candidates = pool.filter((w) => w.toLowerCase() !== correctLower);
    }
    // de-dupe case-insensitively, shuffle
    const seen = new Set();
    const uniq = [];
    for (const c of candidates) {
      const lc = c.toLowerCase();
      if (seen.has(lc)) continue;
      seen.add(lc);
      uniq.push(c);
    }
    shuffle(uniq);
    return uniq.slice(0, count);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Assigns fresh MCQ choices to every question in a deck, pulling
  // distractors from the other cards' own answers. Re-run whenever the
  // card set changes so a newly added or edited card is immediately
  // available as distractor material for the others.
  function rebuildChoices(questions) {
    const pool = questions.map((q) => q.answerShort);
    for (const q of questions) {
      const others = pool.filter((a) => a.toLowerCase() !== q.answerShort.toLowerCase());
      const distractors = buildDistractors(q.answerShort, others, 3);
      q.choices = shuffle([q.answerShort, ...distractors]);
    }
  }

  global.QuizGen = { rebuildChoices };
})(window);
