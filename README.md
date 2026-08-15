# Doxa

Write your own flashcards, then study them with flashcard and multiple-choice modes. No backend, no API keys — everything, including spaced-repetition scheduling and all your decks, runs entirely client-side.

## Features

- **Manual flashcard creation** — build a deck and add your own front → back cards.
- **Flashcards** — tap to flip, swipe (or use the buttons) to grade yourself.
- **Multiple choice** — auto-built distractors pulled from the other cards in the same deck.
- **Smart Review** — lightweight spaced repetition; cards you get right are spaced further out, cards you miss come right back.
- **Streaks, XP/levels, and badges** for staying consistent.
- **Installable PWA** — add it to your home screen and it works offline.

## Running locally

It's static files — no build step. Serve the directory with anything, e.g.:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
