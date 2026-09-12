# Doxa

Write your own flashcards, then study them as quick-recall cards or as full written essay answers. No backend, no API keys — everything, including spaced-repetition scheduling and all your decks, runs entirely client-side.

## Features

- **Exams** — set a date and what it covers, and Doxa projects how much of that material will be solid by exam day *at the pace you actually study*, then tells you what pace would get you to 95%. "Where you stand" breaks that down by deck and topic, weakest first, and each area can be studied on its own with the cards you've never seen leading. Decks say which exams they count toward, so the link reads in both directions. Everything is derived from your own review history — your real success rate and your real cards-per-day — and the screen states the model it used so you can argue with it. When the calendar simply doesn't allow it, it says so rather than flattering you.
- **Sittings** — a bounded stretch of work with a soundscape to sit inside and a finish line you can see. Rain, a fireplace, a café or a night train, all synthesised with Web Audio rather than shipped as audio files, so they cost nothing to download and work offline in the single-file build. A sitting is counted in **cards, not minutes** — twenty-five minutes of staring is not progress, forty cards is — and it draws from what's actually due. Finishing one earns badges on a new Reading Room shelf.
- **Today** — everything due across every deck in one place, with one button. When you're done it tells you when the next lot is due, which is the bit that brings you back. Big backlogs are dealt 40 at a time rather than dumped on you.
- **Three kinds of card** — Quick (term → short answer), Essay (question → model answer) and Picture (an image to identify). Choosing the kind reconfigures the editor: its labels, its examples, how much room the answer gets, and whether the picture comes first. Essay mode practises your essay cards when a deck has any.
- **Images on either side of a card** — anatomy diagrams, histology, radiographs. Pictures are downscaled on import and stored in IndexedDB rather than localStorage (which a few photos would fill on their own), so they stay on your device, work offline, and survive in the single-file build too. Either side can be an image with no text, and any card image can be opened full-screen.
- **Sticking points** — cards you've missed three or more times get their own study mode and a marker in the card list, because a card you keep failing usually needs rewriting rather than re-reading.
- **Flashcards** — tap to flip, swipe (or use the buttons) to grade yourself.
- **Essay practice** — write a long answer from memory, then compare it side by side with the card's model answer and grade yourself. Your last attempt and its word count are kept so you can see how you did before.
- **Topics** — tag a card with a subject and revise that subject across every deck it appears in. Cardiology runs through your anatomy, physiology and pharmacology decks; the deck you happened to file a card in shouldn't decide what you can revise together. Grading in a topic review is written back to each card's own deck.
- **Review** — one entry point per deck. When cards are due it reviews those; when none are, it goes through the deck. Cards you get right are spaced further out, cards you miss come right back — which only works if you grade yourself honestly, so the card says so at the moment you decide.
- **Streaks, XP and levels** for staying consistent.
- **The Cupboard** — a second tab holding 27 badges across five shelves (First Steps, Consistency, Mastery, The Writing Desk, Curiosities). Locked badges stay on the shelf with a progress bar, and a "Nearly there" list surfaces the three you're closest to earning, alongside your running totals: cards mastered, essays written, words written, best streak, days studied and clean sweeps. A completion ring draws itself when you arrive, the totals tick up, and trophies drop onto each shelf as it scrolls into view. Anything won since you last looked wears a NEW ribbon, puts a pip on the tab, and gets scrolled to and unwrapped once. All of it is motion on arrival or on touch — nothing loops — and `prefers-reduced-motion` turns the lot off.
- **Installable PWA** — add it to your home screen and it works offline.

## Running locally

It's static files — no build step. Serve the directory with anything, e.g.:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
