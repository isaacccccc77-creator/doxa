/*
 * QuizGen — builds multiple-choice distractors for a deck's cards
 * entirely client-side (no network, no API keys). Cards themselves are
 * written by hand; this works out plausible wrong answers for MCQ mode.
 *
 * Sources, in order of how convincing they read next to the right
 * answer: other cards in the same deck, then answers from the user's
 * other decks, then options invented from the shape of the answer
 * itself (near-miss numbers, opposites) — so a three-card deck still
 * gets a full set of options instead of a two-way guess.
 */
(function (global) {
  const DISTRACTOR_COUNT = 3;

  function levenshteinClose(a, b) {
    // cheap similarity heuristic for plausible distractors: similar length
    return Math.abs(a.length - b.length) <= 4;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // A yes/no or true/false answer has exactly one sensible wrong answer.
  const OPPOSITE_ANSWERS = {
    true: "False", false: "True",
    yes: "No", no: "Yes",
    increases: "Decreases", decreases: "Increases",
    increase: "Decrease", decrease: "Increase",
    positive: "Negative", negative: "Positive",
    always: "Never", never: "Always",
  };

  function oppositeAnswer(answer) {
    const key = answer.trim().toLowerCase().replace(/[.!]$/, "");
    const opposite = OPPOSITE_ANSWERS[key];
    if (!opposite) return null;
    // Match the casing the user wrote in.
    return answer === answer.toLowerCase() ? opposite.toLowerCase() : opposite;
  }

  // If the right answer is recognisably a member of a known set, the
  // other members of that set are the most convincing wrong answers
  // there are — "Paris" should sit next to Madrid and Rome, not next to
  // a random card from a biology deck.
  const ANSWER_CATEGORIES = [
    ["france", "germany", "spain", "italy", "japan", "china", "india", "brazil", "canada",
     "australia", "mexico", "egypt", "kenya", "nigeria", "peru", "chile", "norway", "sweden",
     "greece", "turkey", "vietnam", "thailand", "indonesia", "portugal", "poland", "argentina"],
    ["paris", "london", "berlin", "madrid", "rome", "tokyo", "beijing", "cairo", "ottawa",
     "canberra", "lisbon", "vienna", "athens", "dublin", "oslo", "helsinki", "bangkok",
     "seoul", "nairobi", "lima", "santiago", "warsaw", "hanoi", "jakarta", "singapore"],
    ["red", "orange", "yellow", "green", "blue", "indigo", "violet", "purple", "black",
     "white", "brown", "pink", "grey", "gray", "turquoise", "magenta"],
    ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"],
    ["january", "february", "march", "april", "may", "june", "july", "august",
     "september", "october", "november", "december"],
    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    ["africa", "antarctica", "asia", "europe", "north america", "south america", "oceania"],
    ["hydrogen", "helium", "lithium", "carbon", "nitrogen", "oxygen", "fluorine", "neon",
     "sodium", "magnesium", "aluminium", "silicon", "phosphorus", "sulfur", "chlorine",
     "potassium", "calcium", "iron", "copper", "zinc", "silver", "gold", "mercury", "lead"],
    ["nucleus", "mitochondrion", "mitochondria", "ribosome", "lysosome", "golgi apparatus",
     "endoplasmic reticulum", "chloroplast", "vacuole", "cytoplasm", "cell membrane",
     "cell wall", "nucleolus"],
    ["heart", "lungs", "liver", "kidneys", "stomach", "brain", "pancreas", "spleen",
     "intestines", "bladder", "skin", "thyroid"],
    ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction",
     "interjection", "determiner"],
    ["addition", "subtraction", "multiplication", "division"],
    ["solid", "liquid", "gas", "plasma"],
    ["north", "south", "east", "west"],
    ["spring", "summer", "autumn", "fall", "winter"],
  ];

  function categoryIndex(answer) {
    const key = String(answer).trim().toLowerCase().replace(/^the\s+/, "").replace(/[.!?]$/, "");
    for (let i = 0; i < ANSWER_CATEGORIES.length; i++) {
      if (ANSWER_CATEGORIES[i].indexOf(key) !== -1) return i;
    }
    return -1;
  }

  function categoryVariants(answer) {
    const index = categoryIndex(answer);
    if (index === -1) return [];
    const key = answer.trim().toLowerCase().replace(/^the\s+/, "").replace(/[.!?]$/, "");
    const capitalize = /^[A-Z]/.test(answer.trim());
    return shuffle(ANSWER_CATEGORIES[index].filter((w) => w !== key)).map((w) =>
      capitalize ? w.charAt(0).toUpperCase() + w.slice(1) : w
    );
  }

  // Near-miss numbers are the one kind of wrong answer that can be
  // invented without knowing anything about the subject — and they're
  // exactly what a well-written multiple-choice question uses.
  const NUMBER_IN_TEXT_RE = /^(.*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/;

  function parseNumeric(answer) {
    const m = String(answer).match(NUMBER_IN_TEXT_RE);
    if (!m) return null;
    const prefix = m[1], numStr = m[2], suffix = m[3];
    // Bail on numbers fused to letters ("3rd", "H2O", "COVID-19") — the
    // variants would read as typos rather than as real alternatives.
    if (/[A-Za-z]$/.test(prefix) || /^[A-Za-z]/.test(suffix)) return null;
    const base = parseFloat(numStr.replace(/,/g, ""));
    if (!isFinite(base)) return null;
    const isInt = numStr.indexOf(".") === -1;
    return {
      prefix, numStr, suffix, base, isInt,
      isYear: isInt && base >= 1000 && base <= 2999 && numStr.indexOf(",") === -1,
    };
  }

  // What sort of thing an answer is, so that a card's options can be
  // kept to answers of the same sort — a year should be up against
  // other years, not against a percentage from two cards away.
  function answerKind(answer) {
    const category = categoryIndex(answer);
    if (category !== -1) return "cat:" + category;
    const n = parseNumeric(answer);
    if (!n) return null;
    const shape = n.isYear ? "year" : n.isInt ? "int" : "dec";
    return "num:" + shape + ":" + n.prefix.trim() + "|" + n.suffix.trim();
  }

  function formatLike(value, sample) {
    const decimals = (sample.split(".")[1] || "").length;
    let out = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
    if (sample.indexOf(",") !== -1) {
      const parts = out.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      out = parts.join(".");
    }
    return out;
  }

  function numericVariants(answer) {
    const n = parseNumeric(answer);
    if (!n) return [];
    const prefix = n.prefix, numStr = n.numStr, suffix = n.suffix;
    const base = n.base, isInt = n.isInt, isYear = n.isYear;

    let candidates;
    if (isYear) {
      candidates = [base - 1, base + 1, base - 2, base + 2, base - 5, base + 5, base - 10, base + 10];
    } else if (isInt && Math.abs(base) <= 20) {
      candidates = [base + 1, base - 1, base + 2, base - 2, base + 3, base * 2];
    } else {
      candidates = [base * 1.1, base * 0.9, base * 1.25, base * 0.75, base * 1.5, base * 0.5, base * 2];
    }

    const out = [];
    for (const value of candidates) {
      if (!isFinite(value)) continue;
      if (base > 0 && value <= 0) continue;
      const text = prefix + formatLike(value, numStr) + suffix;
      if (text.toLowerCase() === answer.toLowerCase()) continue;
      if (out.indexOf(text) === -1) out.push(text);
    }
    return out;
  }

  function buildDistractors(correctAnswer, deckPool, extraPool, count) {
    const correctLower = correctAnswer.toLowerCase();
    const seen = new Set([correctLower]);
    const picked = [];

    function take(list) {
      for (const candidate of list) {
        if (picked.length >= count) return;
        if (!candidate) continue;
        const lc = String(candidate).toLowerCase();
        if (seen.has(lc)) continue;
        seen.add(lc);
        picked.push(candidate);
      }
    }

    // True/false and yes/no answers get exactly one option, not padding.
    const opposite = oppositeAnswer(correctAnswer);
    if (opposite) return [opposite];

    const deckOthers = deckPool.filter((a) => a && a.toLowerCase() !== correctLower);
    const kind = answerKind(correctAnswer);

    // 1. Cards in this deck answering the same sort of thing — a city
    //    beside other cities, a year beside other years.
    if (kind) take(shuffle(deckOthers.filter((a) => answerKind(a) === kind)));

    // 2. Worked out from the answer itself: other members of a category
    //    it belongs to, or near-miss numbers. Better than reaching for an
    //    unrelated card, because these are actually about the question.
    take(categoryVariants(correctAnswer));
    take(numericVariants(correctAnswer));

    // 3. Any other answer in this deck, closest in length first.
    take(shuffle(deckOthers.filter((a) => levenshteinClose(a, correctAnswer))));
    take(shuffle(deckOthers.slice()));

    // 4. The user's other decks — still their own material, so a small
    //    deck is no longer capped at "however many cards you wrote".
    take(shuffle(extraPool.filter((a) => a && a.toLowerCase() !== correctLower)));

    return picked;
  }

  // Assigns fresh MCQ choices to every question in a deck. Re-run
  // whenever the card set changes so a newly added or edited card is
  // immediately available as distractor material for the others.
  // `extraPool` is answers from the user's other decks (optional).
  function rebuildChoices(questions, extraPool) {
    const deckPool = questions.map((q) => q.answerShort);
    const extras = extraPool || [];
    for (const q of questions) {
      const distractors = buildDistractors(q.answerShort, deckPool, extras, DISTRACTOR_COUNT);
      q.choices = shuffle([q.answerShort].concat(distractors));
    }
  }

  global.QuizGen = { rebuildChoices };
})(window);
