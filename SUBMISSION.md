# NoteForge - Devpost submission texts for ML Empowerment Build Challenge 4.0

Copy each block into the matching Devpost field.

## Project name

NoteForge

## Tagline

Paste your lecture notes. NoteForge forges them into flashcards, a quiz and a topic map with machine learning that runs fully in your browser.

## Team

Ibrahim Yahaya (solo), student at the Federal University of Technology Minna, Nigeria.

## Problem Statement

Students sit through lectures and collect pages of notes, but notes alone do not make knowledge stick. Turning notes into study material takes time: someone has to pick out the key terms, write flashcards, invent quiz questions and summarise the main points. Most students skip that work and just re-read, which is one of the weakest ways to study. The tools that promise to do it automatically usually need an account, a subscription, a constant internet connection, or they send your notes to a server. For a student in Minna with a shared phone and unreliable signal, that is a real barrier. There is also a trust problem: when a tool generates questions from thin air, the student cannot tell whether the material matches what the lecturer actually taught.

## Solution Overview

NoteForge takes the student's own lecture notes and forges them into a study pack, using classic machine learning that runs entirely in the browser:

1. **Key terms with TF-IDF.** Each sentence is treated as a document. Terms that appear often in the notes but in few sentences score highest, so the real key terms rise to the top.
2. **Subject tagging with naive Bayes.** A multinomial naive Bayes classifier, trained at load on 24 short example notes for 8 school subjects, scores the notes against every subject and shows confidence percentages.
3. **Extractive summary.** Sentences are ranked by the TF-IDF weight of their terms, and the top three become a quick summary.
4. **Flashcards.** Strong sentences become fill-the-gap cards with one key term blanked out, and definition sentences become "What is X?" cards. Students flip, self-test and mark what they know.
5. **Quiz.** The same cloze sentences become multiple-choice questions, with wrong options drawn from other key terms in the same notes, so every question is grounded in what the lecturer said.

Everything works offline, needs no account and no API key, and the notes never leave the device. Saved note sets live in localStorage.

## Key Features

- Paste any lecture notes (or load one of 3 built-in samples: Biology, Economics, Computer Science)
- Instant study pack: word count, reading time, 3-sentence summary, key terms, subject match
- Flashcards with flip animation, "I know this" tracking and a progress bar
- Generated multiple-choice quiz with instant feedback and a final score
- Topic Map showing naive Bayes confidence for 8 subjects and a TF-IDF key-term cloud
- Library that saves note sets on the device and reopens them later
- Fully offline, mobile friendly, self-hosted fonts

## Technologies Used

- React and Vite for the app
- Design system: Tailwind CSS with shadcn-style design tokens and reusable components (buttons, cards, badges, inputs, progress bars), Lucide icons, Bricolage Grotesque headings with Inter body text, self-hosted fonts so it works offline
- Machine learning written from scratch in plain JavaScript: TF-IDF, extractive sentence ranking, multinomial naive Bayes with Laplace smoothing, cloze-based question generation with a seeded shuffle
- localStorage for saved note sets
- The ML logic is pure functions in one file, covered by 20 unit tests plus 22 automated browser checks, with zero console errors

## Target Users

- University and secondary school students who study from lecture notes, especially where internet access is expensive or unreliable
- Students preparing for tests and exams who want active recall (flashcards and quizzes) instead of passive re-reading
- Teachers and tutors who want a fast way to turn a lesson into practice questions for a class
- Self-learners working through textbooks or online course notes on their own

## Challenges

The hardest part was making generated questions that feel fair. A fill-the-gap question only works if the blanked word is a real key term and the sentence still reads clearly without it, so the generator picks terms by TF-IDF weight and uses the strongest sentences. Distractors also matter: random words make a quiz too easy, so the wrong options are other key terms from the same notes, which forces the student to actually know the material. For the classifier, a small training set can be overconfident, so the Topic Map shows the full confidence spread across all 8 subjects instead of a single label, which keeps the result honest. Finally, everything had to run offline on a modest phone, which ruled out heavy models and pushed the design toward classic, fast algorithms.

## What I learned

Classic ML still earns its place. TF-IDF and naive Bayes are decades old, but they are fast, explainable and small enough to run anywhere, and for study tools that matters more than raw power. I also learned that generated content must stay grounded in the source text: every card and question in NoteForge points back to a real sentence in the student's notes, so nothing is invented.

## Future improvements

- Spaced repetition scheduling so cards come back right before you forget them
- Import notes from PDF and photo uploads with on-device text recognition
- More training subjects and a "teach it" mode where students add their own examples
- Export flashcards to common study apps and print-friendly sheets
- Hausa and French interface options for wider reach in Nigeria

## Demo

- Live demo: [add the deployed link here]
- Demo video: [add the YouTube link here]
- Source code: [add the GitHub repo link here]
- Screenshots: in the docs folder of the repo (Forge, Flashcards, Quiz, Topic Map, Library, mobile view)

## Setup steps

```bash
npm install
npm run dev
```

Open the local address Vite prints. Load a sample note set or paste your own notes, press "Forge study pack", then study the flashcards or take the quiz.

## Credits and acknowledgements

- React and Vite (open source)
- Bricolage Grotesque and Inter fonts from Google Fonts (OFL licence), self-hosted in the repo; Lucide icons (ISC licence)
- The 3 sample note sets were written for this project; no real student data is used anywhere
- All work on this project was done during the ML Empowerment Build Challenge 4.0 period (from 1 Nov 2026)
