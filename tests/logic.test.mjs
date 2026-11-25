import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  tokenize,
  contentTokens,
  splitSentences,
  computeTfIdf,
  extractKeyTerms,
  rankSentences,
  summarize,
  trainNaiveBayes,
  classifyTopics,
  topicModel,
  TRAINING_DOCS,
  makeFlashcards,
  makeQuiz,
  analyzeNotes,
  hashSeed,
  mulberry32,
  shuffled,
  SAMPLE_NOTES,
} from '../src/lib/noteforge.js'

const bio = SAMPLE_NOTES[0].text
const econ = SAMPLE_NOTES[1].text
const cs = SAMPLE_NOTES[2].text

test('tokenize lowercases and keeps words and numbers', () => {
  assert.deepEqual(tokenize('Hello, World! 42 times.'), ['hello', 'world', '42', 'times'])
  assert.deepEqual(tokenize(''), [])
  assert.deepEqual(tokenize(null), [])
})

test('contentTokens removes stopwords and short tokens', () => {
  const toks = contentTokens('The cat is on the mat and it is warm')
  assert.ok(toks.includes('cat'))
  assert.ok(!toks.includes('the'))
  assert.ok(!toks.includes('is'))
})

test('splitSentences splits on punctuation and drops fragments', () => {
  const s = splitSentences('Plants need sunlight to grow well. Animals need food and water every day. Short.')
  assert.equal(s.length, 2)
  assert.ok(s[0].startsWith('Plants need sunlight'))
})

test('computeTfIdf normalises the top term to 1', () => {
  const { scores } = computeTfIdf(bio)
  const max = Math.max(...scores.values())
  assert.ok(Math.abs(max - 1) < 1e-9)
  assert.ok(scores.size > 20)
})

test('extractKeyTerms finds domain terms in biology notes', () => {
  const terms = extractKeyTerms(bio, 12).map((k) => k.term)
  assert.ok(terms.includes('photosynthesis'))
  assert.ok(terms.includes('glucose') || terms.includes('energy') || terms.includes('oxygen'))
})

test('extractKeyTerms respects the limit and is sorted', () => {
  const terms = extractKeyTerms(econ, 5)
  assert.equal(terms.length, 5)
  for (let i = 1; i < terms.length; i++) {
    assert.ok(terms[i - 1].score >= terms[i].score)
  }
})

test('rankSentences returns every sentence with a score', () => {
  const ranked = rankSentences(bio)
  assert.equal(ranked.length, splitSentences(bio).length)
  assert.ok(ranked.every((r) => typeof r.score === 'number' && r.score >= 0))
})

test('summarize returns requested count in original order', () => {
  const summary = summarize(cs, 3)
  assert.equal(summary.length, 3)
  const all = splitSentences(cs)
  const idx = summary.map((s) => all.indexOf(s))
  assert.ok(idx[0] < idx[1] && idx[1] < idx[2])
})

test('naive Bayes classifies the three sample notes correctly', () => {
  const model = topicModel()
  assert.equal(classifyTopics(model, bio)[0].label, 'Biology')
  assert.equal(classifyTopics(model, econ)[0].label, 'Economics')
  assert.equal(classifyTopics(model, cs)[0].label, 'Computer Science')
})

test('classifyTopics confidences sum to about 1', () => {
  const topics = classifyTopics(topicModel(), bio)
  const sum = topics.reduce((a, t) => a + t.confidence, 0)
  assert.ok(Math.abs(sum - 1) < 1e-6)
  assert.equal(topics.length, 8)
})

test('trainNaiveBayes learns from custom docs', () => {
  const model = trainNaiveBayes([
    { label: 'Fruit', text: 'apple banana orange mango fruit sweet' },
    { label: 'Fruit', text: 'grape melon peach fruit juicy' },
    { label: 'Car', text: 'engine wheel brake road drive fuel' },
    { label: 'Car', text: 'steering tyre petrol motor vehicle' },
  ])
  assert.equal(classifyTopics(model, 'sweet mango and banana')[0].label, 'Fruit')
  assert.equal(classifyTopics(model, 'engine and wheel on the road')[0].label, 'Car')
})

test('training corpus covers all 8 subjects', () => {
  const labels = new Set(TRAINING_DOCS.map((d) => d.label))
  assert.equal(labels.size, 8)
  assert.ok(TRAINING_DOCS.length >= 24)
})

test('makeFlashcards builds cloze and definition cards', () => {
  const cards = makeFlashcards(bio)
  assert.ok(cards.length >= 6)
  assert.ok(cards.every((c) => c.front && c.back && c.term))
  const cloze = cards.filter((c) => c.type === 'cloze')
  assert.ok(cloze.length >= 3)
  assert.ok(cloze.every((c) => c.front.includes('_____')))
})

test('makeFlashcards does not repeat terms', () => {
  const cards = makeFlashcards(econ)
  const terms = cards.map((c) => c.term)
  assert.equal(new Set(terms).size, terms.length)
})

test('makeQuiz builds 4-option questions with the answer included', () => {
  const quiz = makeQuiz(cs)
  assert.ok(quiz.length >= 5)
  for (const q of quiz) {
    assert.equal(q.options.length, 4)
    assert.ok(q.options.includes(q.answer))
    assert.ok(q.question.includes('_____'))
    assert.equal(new Set(q.options).size, 4)
  }
})

test('makeQuiz is deterministic for the same text', () => {
  assert.deepEqual(makeQuiz(bio), makeQuiz(bio))
})

test('analyzeNotes returns the full study pack', () => {
  const a = analyzeNotes(econ)
  assert.ok(a.wordCount > 100)
  assert.ok(a.sentenceCount >= 10)
  assert.ok(a.readingMinutes >= 1)
  assert.equal(a.topTopic.label, 'Economics')
  assert.ok(a.keyTerms.length > 0)
  assert.equal(a.summary.length, 3)
  assert.ok(a.flashcards.length > 0)
  assert.ok(a.quiz.length > 0)
})

test('hashSeed and mulberry32 are deterministic', () => {
  assert.equal(hashSeed('noteforge'), hashSeed('noteforge'))
  const r1 = mulberry32(42)
  const r2 = mulberry32(42)
  assert.deepEqual([r1(), r1(), r1()], [r2(), r2(), r2()])
})

test('shuffled keeps every item exactly once', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8]
  const out = shuffled(items, mulberry32(7))
  assert.deepEqual([...out].sort((a, b) => a - b), items)
})

test('empty and tiny inputs do not crash', () => {
  const a = analyzeNotes('')
  assert.equal(a.wordCount, 0)
  assert.deepEqual(a.keyTerms, [])
  assert.deepEqual(makeQuiz('too short'), [])
  assert.deepEqual(makeFlashcards(''), [])
})
