/*
 * DoxaAI — optional AI-enhanced flashcard generation using the caller's
 * own Anthropic API key. Doxa has no backend, so the key lives only in
 * this browser's localStorage and every request goes straight from the
 * browser to Anthropic — never through any server of ours. This is an
 * explicit opt-in: without a saved key, nothing here ever runs, and the
 * free client-side engine (quizgen.js) keeps working fully offline.
 */
(function (global) {
  const KEY_STORAGE = "doxa_anthropic_key";
  const ENABLED_STORAGE = "doxa_ai_enabled";
  const MODEL = "claude-sonnet-5";
  const API_URL = "https://api.anthropic.com/v1/messages";
  const REQUEST_TIMEOUT_MS = 60000;

  function getApiKey() {
    try {
      return localStorage.getItem(KEY_STORAGE) || "";
    } catch (e) {
      return "";
    }
  }

  function setApiKey(key) {
    try {
      if (key) localStorage.setItem(KEY_STORAGE, key);
      else localStorage.removeItem(KEY_STORAGE);
    } catch (e) {
      // ignore — private-mode/quota failures just mean the key won't persist
    }
  }

  function hasApiKey() {
    return !!getApiKey();
  }

  function isEnabled() {
    try {
      return localStorage.getItem(ENABLED_STORAGE) === "1" && hasApiKey();
    } catch (e) {
      return false;
    }
  }

  function setEnabled(on) {
    try {
      localStorage.setItem(ENABLED_STORAGE, on ? "1" : "0");
    } catch (e) {}
  }

  const SYSTEM_PROMPT = [
    "You are an expert study-flashcard writer. Given raw notes or slide content from a student, produce a set of high-quality flashcards that test real, specific facts from the material.",
    "Use your own general knowledge to phrase things accurately and correct obvious typos or garbled text in the source, but never invent facts that go beyond or contradict what the material actually says.",
    "",
    "Rules:",
    "- Skip anything that is not real subject content: presentation housekeeping (\"let's look at...\", \"ask yourself...\"), bare section-header slides with no substance, questions posed to students, near-duplicate points.",
    "- Every card must be understandable entirely on its own, without needing to see any other card.",
    "- Use two card styles:",
    "  - \"define\": prompt is \"What is X?\" (or \"What are X?\" for a plural/collective term), answer is a clear one-to-two sentence explanation, answerShort is just the term X.",
    "  - \"cloze\": prompt is a complete sentence with exactly one key word or short phrase replaced by the literal marker ▁▁▁▁▁, answer and answerShort are both the removed word/phrase.",
    "- Never blank a pronoun, a filler adverb (e.g. \"physically\", \"typically\"), or a generic verb when a more specific noun/term in the same sentence is available.",
    "- If two lines are about the same topic but differ in one distinguishing detail (e.g. \"tilt up\" vs \"tilt down\", two case options), make sure each resulting card explicitly names which one it's about — never produce two cards that would look identical.",
    "- Fix any obviously run-together words you see in the source (e.g. \"isthe\" -> \"is the\").",
    "- Prioritize breadth across distinct concepts over quantity; do not pad with filler cards.",
    "",
    "Respond with ONLY a JSON array — no markdown code fence, no commentary before or after. Each element must have exactly these keys: " +
      '{"type": "define" or "cloze", "prompt": string, "answer": string, "answerShort": string, "sourceSentence": string}. ' +
      "sourceSentence is the corrected sentence the card is based on, or \"\" if the card summarizes multiple lines.",
  ].join("\n");

  function buildUserPrompt(sourceText, maxQuestions) {
    return `Generate at most ${maxQuestions} flashcards from this material:\n\n${sourceText}`;
  }

  function extractJsonArray(text) {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end < start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (e) {
      return null;
    }
  }

  function normalizeQuestions(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    list.forEach((item, i) => {
      if (!item || typeof item !== "object") return;
      const prompt = String(item.prompt || "").trim();
      const answer = String(item.answer || "").trim();
      if (!prompt || !answer) return;
      const type = item.type === "cloze" ? "cloze" : "define";
      if (type === "cloze" && !prompt.includes("▁")) return; // malformed cloze, skip
      out.push({
        id: "ai" + i,
        type,
        prompt,
        answer,
        answerShort: String(item.answerShort || answer).trim(),
        sourceSentence: item.sourceSentence ? String(item.sourceSentence).trim() : "",
      });
    });
    return out;
  }

  async function generateWithAI(sourceText, opts) {
    opts = opts || {};
    const maxQuestions = opts.maxQuestions || 25;
    const key = getApiKey();
    if (!key) throw new Error("No AI API key is saved yet.");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;
    try {
      res = await fetch(API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildUserPrompt(sourceText, maxQuestions) }],
        }),
      });
    } catch (e) {
      if (e && e.name === "AbortError") {
        throw new Error("The AI took too long to respond — try again, or use the free engine.");
      }
      throw new Error("Couldn't reach the AI service — check your internet connection.");
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401) throw new Error("That API key was rejected — check it's correct in AI settings.");
    if (res.status === 429) throw new Error("The AI service is rate-limiting this key — try again shortly.");
    if (!res.ok) {
      let detail = "";
      try {
        const errBody = await res.json();
        detail = (errBody && errBody.error && errBody.error.message) || "";
      } catch (e) {}
      throw new Error(`AI service error (${res.status})${detail ? ": " + detail : "."}`);
    }

    const data = await res.json();
    const blocks = Array.isArray(data.content) ? data.content : [];
    const text = blocks.map((b) => (b && b.type === "text" ? b.text : "")).join("");
    const parsed = extractJsonArray(text);
    const questions = normalizeQuestions(parsed).slice(0, maxQuestions);
    if (questions.length === 0) throw new Error("The AI didn't return any usable flashcards — try the free engine instead.");
    return questions;
  }

  global.DoxaAI = { getApiKey, setApiKey, hasApiKey, isEnabled, setEnabled, generateWithAI };
})(window);
