# Doxa

Write your own flashcards, then study them as quick-recall cards or as full written essay answers. No backend, no API keys — everything, including spaced-repetition scheduling and all your decks, runs entirely client-side.

## Features

- **Manual flashcard creation** — build a deck and add your own front → back cards. The back can be a couple of words or a full model answer.
- **Flashcards** — tap to flip, swipe (or use the buttons) to grade yourself.
- **Essay practice** — write a long answer from memory, then compare it side by side with the card's model answer and grade yourself. Your last attempt and its word count are kept so you can see how you did before.
- **Smart Review** — lightweight spaced repetition; cards you get right are spaced further out, cards you miss come right back.
- **Streaks, XP and levels** for staying consistent.
- **The Cupboard** — a second tab holding 27 badges across five shelves (First Steps, Consistency, Mastery, The Writing Desk, Curiosities). Locked badges stay on the shelf with a progress bar, and a "Nearly there" list surfaces the three you're closest to earning, alongside your running totals: cards mastered, essays written, words written, best streak, days studied and clean sweeps.
- **Installable PWA** — add it to your home screen and it works offline.

## Running locally

It's static files — no build step. Serve the directory with anything, e.g.:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
