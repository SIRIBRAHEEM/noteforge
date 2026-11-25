import { useEffect, useMemo, useState } from 'react'
import { analyzeNotes, SAMPLE_NOTES } from './lib/noteforge.js'

const STORAGE_KEY = 'noteforge-sets-v1'

const VIEWS = [
  { id: 'forge', label: 'Forge', hint: 'Paste notes, get a study pack' },
  { id: 'cards', label: 'Flashcards', hint: 'Flip, test, repeat' },
  { id: 'quiz', label: 'Quiz', hint: 'Questions from your notes' },
  { id: 'topics', label: 'Topic Map', hint: 'Subjects and key terms' },
  { id: 'library', label: 'Library', hint: 'Saved note sets' },
]

function loadSets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveSets(sets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets))
  } catch {
    // storage full or unavailable: the app keeps working in memory
  }
}

function pct(x) {
  return `${Math.round(x * 100)}%`
}

export default function App() {
  const [view, setView] = useState('forge')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [sets, setSets] = useState(loadSets)
  const [notice, setNotice] = useState('')
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState({})
  const [quizIndex, setQuizIndex] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const [quizDone, setQuizDone] = useState(false)

  useEffect(() => {
    saveSets(sets)
  }, [sets])

  const wordCount = useMemo(() => (notes.trim() ? notes.trim().split(/\s+/).length : 0), [notes])
  const canForge = wordCount >= 40

  function runForge(nextTitle, nextNotes) {
    const result = analyzeNotes(nextNotes)
    setAnalysis(result)
    setCardIndex(0)
    setFlipped(false)
    setKnown({})
    setQuizIndex(0)
    setPicked(null)
    setScore(0)
    setQuizDone(false)
    setNotice(
      `Forged ${result.flashcards.length} flashcards and ${result.quiz.length} quiz questions. Top topic: ${result.topTopic ? result.topTopic.label : 'unknown'} (${result.topTopic ? pct(result.topTopic.confidence) : '0%'}).`,
    )
    return result
  }

  function handleForge() {
    if (!canForge) return
    runForge(title, notes)
    setView('cards')
  }

  function loadSample(sample) {
    setTitle(sample.title)
    setNotes(sample.text)
    runForge(sample.title, sample.text)
    setView('forge')
  }

  function saveSet() {
    if (!analysis) return
    const entry = {
      id: `set-${Date.now()}`,
      title: title.trim() || 'Untitled notes',
      notes,
      savedAt: new Date().toISOString(),
      topTopic: analysis.topTopic ? analysis.topTopic.label : 'General',
      cardCount: analysis.flashcards.length,
      quizCount: analysis.quiz.length,
    }
    setSets((prev) => [entry, ...prev])
    setNotice(`Saved "${entry.title}" to your library.`)
  }

  function openSet(entry) {
    setTitle(entry.title)
    setNotes(entry.notes)
    runForge(entry.title, entry.notes)
    setView('forge')
  }

  function deleteSet(id) {
    setSets((prev) => prev.filter((s) => s.id !== id))
  }

  const cards = analysis ? analysis.flashcards : []
  const card = cards[cardIndex] || null
  const knownCount = Object.values(known).filter(Boolean).length

  function markCard(isKnown) {
    if (!card) return
    setKnown((prev) => ({ ...prev, [cardIndex]: isKnown }))
    setFlipped(false)
    setCardIndex((i) => Math.min(i + 1, cards.length - 1))
  }

  const quiz = analysis ? analysis.quiz : []
  const question = quiz[quizIndex] || null

  function pickOption(option) {
    if (picked || !question) return
    setPicked(option)
    if (option === question.answer) setScore((s) => s + 1)
  }

  function nextQuestion() {
    setPicked(null)
    if (quizIndex + 1 >= quiz.length) {
      setQuizDone(true)
    } else {
      setQuizIndex((i) => i + 1)
    }
  }

  function restartQuiz() {
    setQuizIndex(0)
    setPicked(null)
    setScore(0)
    setQuizDone(false)
  }

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">N</div>
          <div>
            <h1>NoteForge</h1>
            <p>Notes in. Study tools out.</p>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={view === v.id ? 'nav-item active' : 'nav-item'}
              onClick={() => setView(v.id)}
            >
              <span className="nav-label">{v.label}</span>
              <span className="nav-hint">{v.hint}</span>
            </button>
          ))}
        </nav>
        <div className="rail-foot">
          <p>Runs fully in your browser. No account, no signal needed. Your notes never leave this device.</p>
        </div>
      </aside>

      <main className="main">
        <header className="hero">
          <p className="eyebrow">In-browser machine learning for students</p>
          <h2>Paste your lecture notes. NoteForge forges them into study tools.</h2>
          <p className="hero-sub">
            TF-IDF finds the key terms, a naive Bayes classifier tags the subject, and the app builds
            flashcards, a quiz and a summary from your own words.
          </p>
        </header>

        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button type="button" className="notice-x" onClick={() => setNotice('')} aria-label="Dismiss">
              x
            </button>
          </div>
        )}

        {view === 'forge' && (
          <section className="panel" aria-label="Forge">
            <div className="panel-head">
              <h3>1. Add your notes</h3>
              <div className="sample-row">
                <span>Try a sample:</span>
                {SAMPLE_NOTES.map((s) => (
                  <button key={s.id} type="button" className="chip" onClick={() => loadSample(s)}>
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Biology week 4 - Cells"
              />
            </label>
            <label className="field">
              <span>Lecture notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={12}
                placeholder="Paste your lecture notes here. At least a few paragraphs works best."
              />
            </label>
            <div className="forge-bar">
              <span className="word-count">{wordCount} words{canForge ? '' : ' - add at least 40 words to forge'}</span>
              <div className="forge-actions">
                {analysis && (
                  <button type="button" className="btn ghost" onClick={saveSet}>
                    Save to library
                  </button>
                )}
                <button type="button" className="btn primary" onClick={handleForge} disabled={!canForge}>
                  Forge study pack
                </button>
              </div>
            </div>

            {analysis && (
              <div className="pack">
                <h3>2. Your study pack</h3>
                <div className="stat-grid">
                  <div className="stat"><strong>{analysis.wordCount}</strong><span>words read</span></div>
                  <div className="stat"><strong>{analysis.sentenceCount}</strong><span>sentences</span></div>
                  <div className="stat"><strong>{analysis.readingMinutes} min</strong><span>reading time</span></div>
                  <div className="stat"><strong>{analysis.flashcards.length}</strong><span>flashcards</span></div>
                  <div className="stat"><strong>{analysis.quiz.length}</strong><span>quiz questions</span></div>
                  <div className="stat"><strong>{analysis.topTopic ? analysis.topTopic.label : '-'}</strong><span>top topic</span></div>
                </div>
                <div className="summary-box">
                  <h4>Summary in 3 sentences</h4>
                  {analysis.summary.map((s, i) => (
                    <p key={i}>{s}</p>
                  ))}
                </div>
                <div className="pack-actions">
                  <button type="button" className="btn primary" onClick={() => setView('cards')}>Study flashcards</button>
                  <button type="button" className="btn" onClick={() => setView('quiz')}>Take the quiz</button>
                  <button type="button" className="btn" onClick={() => setView('topics')}>See topic map</button>
                </div>
              </div>
            )}
          </section>
        )}

        {view === 'cards' && (
          <section className="panel" aria-label="Flashcards">
            <div className="panel-head">
              <h3>Flashcards</h3>
              {cards.length > 0 && <span className="muted">Card {cardIndex + 1} of {cards.length} - known {knownCount}</span>}
            </div>
            {!card && <p className="empty">No flashcards yet. Forge a study pack first, or load a sample on the Forge screen.</p>}
            {card && (
              <>
                <button type="button" className={flipped ? 'flashcard flipped' : 'flashcard'} onClick={() => setFlipped((f) => !f)}>
                  <span className="flash-tag">{card.type === 'cloze' ? 'Fill the gap' : 'Define it'}</span>
                  <span className="flash-text">{flipped ? card.back : card.front}</span>
                  <span className="flash-hint">{flipped ? 'Tap to see the question' : 'Tap to reveal the answer'}</span>
                </button>
                <div className="card-actions">
                  <button type="button" className="btn" onClick={() => { setFlipped(false); setCardIndex((i) => Math.max(i - 1, 0)) }} disabled={cardIndex === 0}>Back</button>
                  <button type="button" className="btn warn" onClick={() => markCard(false)}>Still learning</button>
                  <button type="button" className="btn primary" onClick={() => markCard(true)}>I know this</button>
                  <button type="button" className="btn" onClick={() => { setFlipped(false); setCardIndex((i) => Math.min(i + 1, cards.length - 1)) }} disabled={cardIndex >= cards.length - 1}>Next</button>
                </div>
                <div className="progress"><div className="progress-fill" style={{ width: `${cards.length ? (knownCount / cards.length) * 100 : 0}%` }} /></div>
                <p className="muted center">{knownCount} of {cards.length} marked as known</p>
              </>
            )}
          </section>
        )}

        {view === 'quiz' && (
          <section className="panel" aria-label="Quiz">
            <div className="panel-head">
              <h3>Quiz</h3>
              {quiz.length > 0 && !quizDone && <span className="muted">Question {quizIndex + 1} of {quiz.length} - score {score}</span>}
            </div>
            {quiz.length === 0 && <p className="empty">No quiz yet. Forge a study pack first, or load a sample on the Forge screen.</p>}
            {question && !quizDone && (
              <>
                <p className="quiz-q">{question.question}</p>
                <div className="quiz-options">
                  {question.options.map((option) => {
                    let cls = 'quiz-option'
                    if (picked && option === question.answer) cls += ' correct'
                    else if (picked && option === picked) cls += ' wrong'
                    return (
                      <button key={option} type="button" className={cls} onClick={() => pickOption(option)} disabled={Boolean(picked)}>
                        {option}
                      </button>
                    )
                  })}
                </div>
                {picked && (
                  <div className="quiz-feedback">
                    <p>{picked === question.answer ? 'Correct. Well done.' : `Not quite. The answer is ${question.answer}.`}</p>
                    <button type="button" className="btn primary" onClick={nextQuestion}>
                      {quizIndex + 1 >= quiz.length ? 'See result' : 'Next question'}
                    </button>
                  </div>
                )}
              </>
            )}
            {quizDone && (
              <div className="quiz-result">
                <p className="big-score">{score} / {quiz.length}</p>
                <p>{score === quiz.length ? 'Perfect score. You know these notes well.' : score >= quiz.length / 2 ? 'Good work. Review the flashcards for the ones you missed.' : 'Keep going. Study the flashcards, then try again.'}</p>
                <button type="button" className="btn primary" onClick={restartQuiz}>Retake quiz</button>
              </div>
            )}
          </section>
        )}

        {view === 'topics' && (
          <section className="panel" aria-label="Topic Map">
            <div className="panel-head"><h3>Topic Map</h3></div>
            {!analysis && <p className="empty">No topic map yet. Forge a study pack first, or load a sample on the Forge screen.</p>}
            {analysis && (
              <div className="topic-grid">
                <div className="topic-box">
                  <h4>Subject match (naive Bayes)</h4>
                  {analysis.topics.map((t) => (
                    <div key={t.label} className="topic-row">
                      <span className="topic-name">{t.label}</span>
                      <span className="topic-bar"><span className="topic-fill" style={{ width: pct(t.confidence) }} /></span>
                      <span className="topic-pct">{pct(t.confidence)}</span>
                    </div>
                  ))}
                  <p className="muted">The classifier was trained on short example notes for 8 school subjects and scores your notes against each one.</p>
                </div>
                <div className="topic-box">
                  <h4>Key terms (TF-IDF)</h4>
                  <div className="term-list">
                    {analysis.keyTerms.map((k) => (
                      <span key={k.term} className="term" style={{ fontSize: `${0.85 + k.score * 0.7}rem` }}>
                        {k.term}<small>{k.count}x</small>
                      </span>
                    ))}
                  </div>
                  <p className="muted">Bigger terms carry more weight in your notes. TF-IDF rewards words that appear often here but are not common everywhere.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {view === 'library' && (
          <section className="panel" aria-label="Library">
            <div className="panel-head"><h3>Library</h3><span className="muted">{sets.length} saved set{sets.length === 1 ? '' : 's'}</span></div>
            {sets.length === 0 && <p className="empty">Nothing saved yet. Forge a study pack, then choose Save to library.</p>}
            <div className="set-list">
              {sets.map((s) => (
                <article key={s.id} className="set-card">
                  <h4>{s.title}</h4>
                  <p className="muted">{s.topTopic} - {s.cardCount} flashcards - {s.quizCount} quiz questions</p>
                  <p className="muted">Saved {new Date(s.savedAt).toLocaleDateString()}</p>
                  <div className="set-actions">
                    <button type="button" className="btn primary" onClick={() => openSet(s)}>Open</button>
                    <button type="button" className="btn ghost" onClick={() => deleteSet(s.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="foot">
          <p>NoteForge by Ibrahim Yahaya, FUTMINNA. Built for the ML Empowerment Build Challenge 4.0. All machine learning runs locally in your browser.</p>
        </footer>
      </main>
    </div>
  )
}
