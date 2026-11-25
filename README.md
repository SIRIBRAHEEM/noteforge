# NoteForge

Paste your lecture notes. NoteForge forges them into study tools.

NoteForge is a small web app that turns plain lecture notes into a full study pack using machine learning that runs entirely in your browser:

- **Key terms** found with TF-IDF (term frequency, inverse document frequency)
- **Subject tagging** with a naive Bayes classifier trained on example notes for 8 school subjects
- **A 3-sentence summary** picked by extractive sentence ranking
- **Flashcards** built from your own sentences (fill-the-gap and definition cards)
- **A multiple-choice quiz** generated from your notes, with distractors taken from your key terms

Everything works offline. No account, no server, no API key. Your notes never leave your device; saved sets live in your browser's localStorage.

## Run it

```bash
npm install
npm run dev
```

Open the local address Vite prints. Three sample note sets (Biology, Economics, Computer Science) are built in, so every screen works immediately: load a sample, watch the study pack appear, then study the flashcards or take the quiz.

## Build

```bash
npm run build
```

The production build is a static site in `dist/` and can be hosted anywhere (GitHub Pages, Netlify, any static host). It works fully offline once loaded.

## Tests

```bash
npm test          # 20 unit tests for the ML logic (node --test)
npm run lint      # oxlint
npm run build && node scripts/e2e.mjs   # 22 browser checks + screenshots
```

## How the ML works

All logic lives in `src/lib/noteforge.js` as pure functions:

- **TF-IDF**: each sentence is treated as one document. Terms that appear often in your notes but in few sentences score highest, which surfaces the real key terms instead of filler words.
- **Sentence ranking**: sentences are scored by the TF-IDF weight of their terms, softened by length. The top sentences become the summary and the source material for cards and questions.
- **Naive Bayes**: a multinomial naive Bayes classifier with Laplace smoothing, trained at load on 24 short example notes covering Biology, Chemistry, Physics, Economics, History, Computer Science, Mathematics and Literature. It returns a confidence score for every subject.
- **Flashcards**: strong sentences become fill-the-gap (cloze) cards with one key term blanked out, and sentences of the form "X is ..." become "What is X?" definition cards.
- **Quiz**: cloze sentences become multiple-choice questions. Wrong options are other key terms from the same notes, shuffled with a seeded random generator so the same notes always produce the same quiz.

## Tech

- React and Vite
- Plain CSS written from scratch (graph-paper study desk theme, Space Grotesk and Inter, self-hosted fonts)
- localStorage for saved note sets
- No backend, no external services

## Screenshots

See the `docs/` folder: Forge screen, Flashcards, Quiz, Topic Map, Library, and a mobile view.

## Author

Ibrahim Yahaya, student at the Federal University of Technology Minna (FUTMINNA), Nigeria. Built for the ML Empowerment Build Challenge 4.0.
