/*
 * QuizGen — turns raw notes text into flashcards / multiple-choice
 * questions entirely client-side (no network, no API keys).
 *
 * Approach: split into sentences, score candidate keywords per sentence
 * (frequency across the doc, length, capitalization, numerals), detect
 * "X is/means/refers to Y" definition sentences for higher-quality
 * question/answer pairs, and fall back to cloze deletion (blank the
 * best keyword) for everything else. Distractors for multiple choice
 * are pulled from other keywords/terms found in the same notes.
 */
(function (global) {
  const STOPWORDS = new Set(
    ("a about above after again against all am an and any are aren't as at be because been " +
     "before being below between both but by can't cannot could couldn't did didn't do does " +
     "doesn't doing don't down during each few for from further had hadn't has hasn't have " +
     "haven't having he he'd he'll he's her here here's hers herself him himself his how how's " +
     "i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my " +
     "myself no nor not of off on once only or other ought our ours ourselves out over own same " +
     "shan't she she'd she'll she's should shouldn't so some such than that that's the their " +
     "theirs them themselves then there there's these they they'd they'll they're they've this " +
     "those through to too under until up very was wasn't we we'd we'll we're we've were weren't " +
     "what what's when when's where where's which while who who's whom why why's with won't " +
     "would wouldn't you you'd you'll you're you've your yours yourself yourselves also often " +
     "however thus therefore may might one two three within across upon many much several like " +
     "sometimes usually typically commonly frequently generally occasionally rarely " +
     "使用 include includes including used uses using make makes making etc").split(" ")
  );

  const ABBREVS = new Set(["mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc", "e.g", "i.e", "st", "no", "fig", "approx"]);

  function splitSentences(text) {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return [];
    const raw = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9"'“])/g);
    const out = [];
    for (let s of raw) {
      s = s.trim();
      if (!s) continue;
      const lastWord = s.slice(0, -1).split(" ").pop().toLowerCase().replace(/\./g, "");
      if (ABBREVS.has(lastWord) && s.length < 400) {
        if (out.length) { out[out.length - 1] += " " + s; continue; }
      }
      out.push(s);
    }
    return out;
  }

  function tokenize(sentence) {
    return sentence.match(/[A-Za-z][A-Za-z'’-]*|\d+(\.\d+)?%?/g) || [];
  }

  function isCapitalizedWord(word) {
    return /^[A-Z][a-z'’-]+$/.test(word);
  }

  function buildFrequency(sentences) {
    const freq = new Map();
    for (const s of sentences) {
      const seen = new Set();
      for (const w of tokenize(s)) {
        const lw = w.toLowerCase();
        if (seen.has(lw)) continue;
        seen.add(lw);
        freq.set(lw, (freq.get(lw) || 0) + 1);
      }
    }
    return freq;
  }

  function keywordScore(word, index, wordsInSentence, freq, sentenceCount, avoidSet) {
    const lw = word.toLowerCase();
    if (STOPWORDS.has(lw)) return -1;
    if (avoidSet && avoidSet.has(lw)) return -1;
    if (/^\d+$/.test(word) && word.length <= 1) return -1;
    if (word.length < 3 && !/^\d+$/.test(word)) return -1;

    let score = 0;
    const f = freq.get(lw) || 1;
    // Reward terms that recur (central concepts) but punish ones that are
    // in almost every sentence (too generic to be an interesting blank).
    // Within a small handful of sentences (typically one slide's worth of
    // bullets), recurrence is much weaker evidence of being a genuine
    // central concept — it's often just shared scaffolding across
    // parallel bullets ("X can do A" / "X can do B"), where the point of
    // each sentence is precisely the word that *isn't* repeated.
    const docRatio = f / Math.max(1, sentenceCount);
    if (f >= 2 && docRatio < 0.6) score += sentenceCount >= 6 ? 3 : 1;
    if (f === 1) score += 1;
    if (docRatio > 0.75) score -= 3;

    score += Math.min(word.length / 4, 3);
    if (isCapitalizedWord(word) && index > 0) score += 2.5;
    if (/^\d/.test(word)) score += 2;
    if (/^[A-Z]{2,}$/.test(word)) score += 2; // acronym
    // Word right after "to" is very often an infinitive verb ("used to
    // give", "helps to reveal") — those make weak blanks compared to the
    // noun/concept the verb is acting on, and in parallel bullet lists
    // ("X can be used to A" / "...to B" / "...to C") the repeated verb
    // would otherwise win on frequency alone.
    if (index > 0 && wordsInSentence[index - 1].toLowerCase() === "to") score -= 2.5;

    return score;
  }

  function pickKeywords(sentence, freq, sentenceCount, max, avoidSet) {
    const words = tokenize(sentence);
    const scored = words.map((w, i) => ({
      word: w,
      index: i,
      score: keywordScore(w, i, words, freq, sentenceCount, avoidSet),
    })).filter(x => x.score > 0);
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tie-break toward the rarer word: all else equal, it's more likely
      // to be the sentence's specific point than shared scaffolding.
      const fa = freq.get(a.word.toLowerCase()) || 1;
      const fb = freq.get(b.word.toLowerCase()) || 1;
      return fa - fb;
    });
    const chosen = [];
    const usedLower = new Set();
    for (const cand of scored) {
      if (chosen.length >= max) break;
      const lw = cand.word.toLowerCase();
      if (usedLower.has(lw)) continue;
      usedLower.add(lw);
      chosen.push(cand);
    }
    return chosen;
  }

  // Words a term/blank should never start with — almost never the start of
  // a real standalone concept, usually a sign the sentence was picked up
  // mid-thought (e.g. "By doing so, viewers are..." -> a bad "term").
  const BAD_TERM_STARTS = new Set([
    "by", "so", "this", "that", "these", "those", "it", "there", "then",
    "thus", "also", "however", "when", "while", "because", "since",
    "although", "if", "as", "and", "but", "or",
  ]);

  const DEFINITION_RE = /^(.{2,40}?)\s+(?:is|are|refers to|means|represents|denotes|is defined as|was|were)\s+(.{8,})[.]?$/i;

  // A term that's just a pronoun ("They are sometimes called...") isn't a
  // standalone concept — it's referring back to something earlier in the
  // notes that a flashcard alone can't see, so "What is They?" is nonsense.
  const PRONOUN_TERMS = new Set([
    "it", "they", "he", "she", "this", "that", "these", "those", "who",
    "which", "we", "i", "you",
  ]);

  function tryDefinitionPair(sentence) {
    const m = sentence.match(DEFINITION_RE);
    if (!m) return null;
    let term = m[1].trim().replace(/^(the|a|an)\s+/i, "");
    // "The nucleolus, found inside the nucleus, is responsible..." — an
    // appositive clause between commas isn't part of the term itself.
    term = term.split(",")[0].trim();
    let def = m[2].trim().replace(/[.\s]+$/, "");
    const termWords = term.split(/\s+/);
    if (termWords.length > 6 || term.length < 2) return null;
    if (def.split(/\s+/).length < 2) return null;
    if (BAD_TERM_STARTS.has(termWords[0].toLowerCase())) return null;
    if (termWords.length === 1 && PRONOUN_TERMS.has(term.toLowerCase())) return null;
    return { term, definition: def };
  }

  // A line that's entirely uppercase letters (ignoring digits/punctuation)
  // reads as a section banner or poster slide ("CAUSES OF WORLD WAR I"),
  // not real informative content — real sentences don't shout every word.
  function isShoutingBanner(sentence) {
    const letters = sentence.replace(/[^a-zA-Z]/g, "");
    return letters.length > 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
  }

  function cloze(sentence, keyword) {
    const re = new RegExp("\\b" + keyword.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
    const blanked = sentence.replace(re, "▁▁▁▁▁");
    if (blanked === sentence) return null;
    return blanked;
  }

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

  function generateQuiz(text, opts) {
    opts = opts || {};
    const maxQuestions = opts.maxQuestions || 25;
    const avoidSet = new Set((opts.avoidWords || []).map((w) => w.toLowerCase()));
    const sentences = splitSentences(text).filter((s) => {
      const wc = s.split(/\s+/).length;
      if (wc < 5 || wc > 45) return false;
      if (s.trim().endsWith("?")) return false;
      if (isShoutingBanner(s)) return false;
      // Sentences starting with a connector ("By doing so...", "This...")
      // are continuation fragments that only make sense next to whatever
      // came before them — weak and often confusing as a standalone card.
      const firstWord = s.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
      if (BAD_TERM_STARTS.has(firstWord)) return false;
      return true;
    });
    if (sentences.length === 0) return { questions: [], keywordPool: [] };

    const freq = buildFrequency(sentences);
    const sentenceCount = sentences.length;

    // Build a global pool of "interesting" terms/keywords for distractors.
    const poolSet = new Set();
    for (const s of sentences) {
      const words = tokenize(s);
      words.forEach((w, i) => {
        if (keywordScore(w, i, words, freq, sentenceCount) >= 2) poolSet.add(w);
      });
    }
    const keywordPool = Array.from(poolSet);

    const questions = [];
    const usedSentences = new Set();
    // Grows as sentences are processed so the same word doesn't get picked
    // as the blank for two different sibling sentences in a row (e.g. two
    // bullets that both happen to mention "character" but differ in the
    // actually-interesting word after it).
    const usedAnswers = new Set(avoidSet);

    for (const sentence of sentences) {
      if (questions.length >= maxQuestions) break;
      if (usedSentences.has(sentence)) continue;

      const defPair = tryDefinitionPair(sentence);
      if (defPair) {
        const distractorPool = keywordPool.filter(
          (w) => w.toLowerCase() !== defPair.term.toLowerCase()
        );
        // also pull other terms captured from definition pairs so MCQ options
        // read like real answers rather than random nouns
        questions.push({
          id: "q" + questions.length,
          type: "define",
          prompt: `What is ${defPair.term}?`,
          answer: defPair.definition,
          answerShort: defPair.term,
          choicesSource: "sentence-defs",
          sourceSentence: sentence,
        });
        usedSentences.add(sentence);
        usedAnswers.add(defPair.term.toLowerCase());
        continue;
      }

      const picks = pickKeywords(sentence, freq, sentenceCount, 1, usedAnswers);
      if (picks.length === 0) continue;
      const keyword = picks[0];
      const blanked = cloze(sentence, keyword);
      if (!blanked) continue;

      questions.push({
        id: "q" + questions.length,
        type: "cloze",
        prompt: blanked,
        answer: keyword.word,
        answerShort: keyword.word,
        sourceSentence: sentence,
      });
      usedAnswers.add(keyword.word.toLowerCase());
      usedSentences.add(sentence);
    }

    // Now assign MCQ choices for every question using the keyword pool
    // (and other questions' definition terms as extra distractor material).
    const defTerms = questions.filter(q => q.type === "define").map(q => q.answerShort);
    for (const q of questions) {
      let pool = q.type === "define"
        ? defTerms.concat(keywordPool)
        : keywordPool;
      const distractors = buildDistractors(q.answerShort, pool, 3);
      // Short/narrow notes may not yield 3 real distractors — ship fewer
      // options rather than padding with meaningless filler answers.
      q.choices = shuffle([q.answerShort, ...distractors]);
    }

    shuffle(questions);
    questions.forEach((q, i) => (q.order = i));

    return { questions, keywordPool };
  }

  // Assign fresh MCQ choices to every question in the list, pulling
  // distractors from the other questions' own answers. Used for
  // manually-authored cards (which have no notes/keywordPool to draw
  // from) and re-run whenever a deck's card set changes, so newly added
  // or edited cards are immediately available as distractor material.
  function rebuildChoices(questions) {
    const pool = questions.map((q) => q.answerShort);
    for (const q of questions) {
      const others = pool.filter((a) => a.toLowerCase() !== q.answerShort.toLowerCase());
      const distractors = buildDistractors(q.answerShort, others, 3);
      q.choices = shuffle([q.answerShort, ...distractors]);
    }
  }

  // Strips a leading list marker ("(a) ", "b) ", "1. ", "12) ") from a
  // line — common on sub-points within a bullet, and otherwise leaks into
  // the extracted term/answer (e.g. "What is (a) The camera movement...").
  const LIST_MARKER_RE = /^\(?[a-zA-Z0-9]{1,2}\)?[.)]\s+/;

  // Slide decks aren't prose — a slide's bullets are often sentence
  // fragments, so running the whole deck through generateQuiz's sentence
  // parser as one blob would perform poorly, and would also let a
  // recurring word (most often the slide's own title) get picked as the
  // cloze blank for every sibling bullet instead of each bullet's actual
  // distinguishing fact. So each slide is processed on its own: one direct
  // "what do you know about X" card built straight from its own bullets
  // (reliable regardless of how fragmented the bullets are), plus that
  // slide's bullets run individually through the prose pipeline — with the
  // slide's own title words excluded from consideration as a blank — to
  // pick up well-formed atomic facts as their own cards.
  function generateQuizFromSlides(slides, opts) {
    opts = opts || {};
    const maxQuestions = opts.maxQuestions || 60;

    const titleCards = [];
    const atomicCards = [];
    const usedTitles = new Set();

    for (const slide of slides) {
      const title = (slide.title || "").trim();
      let bullets = (slide.bullets || [])
        .map((b) => b.trim().replace(LIST_MARKER_RE, ""))
        .filter(Boolean);

      if (title && bullets.length > 0 && !usedTitles.has(title.toLowerCase())) {
        usedTitles.add(title.toLowerCase());
        titleCards.push({
          type: "define",
          prompt: `What do you know about ${title}?`,
          answer: bullets.join("; "),
          answerShort: title,
          sourceSentence: "",
        });
      }

      // A title with no bullets beneath it is usually just a section label
      // ("The end") — but sometimes it's the slide's only text because it
      // happens to be one standalone sentence (a definition slide, a case
      // study answer). Treat anything long enough to actually be a
      // sentence as prose instead of silently dropping it.
      if (bullets.length === 0 && title.split(/\s+/).length >= 5) {
        bullets = [title];
      }
      if (bullets.length === 0) continue;

      const slideText = bullets
        .map((b) => (/[.!?]$/.test(b) ? b : b + "."))
        .join(" ");
      const perSlide = generateQuiz(slideText, {
        maxQuestions: 20,
        avoidWords: title ? title.split(/\s+/) : [],
      });
      for (const q of perSlide.questions) {
        if (!usedTitles.has(q.answerShort.toLowerCase())) atomicCards.push(q);
      }
    }

    const combined = titleCards.concat(atomicCards).slice(0, maxQuestions);
    combined.forEach((q, i) => (q.id = "sl" + i));

    rebuildChoices(combined);
    shuffle(combined);
    combined.forEach((q, i) => (q.order = i));

    return { questions: combined };
  }

  global.QuizGen = { generateQuiz, splitSentences, rebuildChoices, generateQuizFromSlides };
})(window);
