# Doxa

Paste your notes, get instant flashcards and quizzes. No backend, no API keys — the quiz generator, spaced-repetition scheduling, and all your decks run entirely client-side.

## Features

- **Quiz generation** from raw text — sentence splitting, definition-pattern detection ("X is Y" → "What is X?"), and cloze deletion, with multiple-choice distractors pulled from your own notes.
- **Flashcards** — tap to flip, swipe (or use the buttons) to grade yourself.
- **Smart Review** — lightweight spaced repetition; cards you get right are spaced further out, cards you miss come right back.
- **Streaks, XP/levels, and badges** for staying consistent.
- **Installable PWA** — add it to your home screen and it works offline.

## Running locally

It's static files — no build step. Serve the directory with anything, e.g.:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
