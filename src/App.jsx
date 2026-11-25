import { useEffect, useMemo, useState } from 'react'
import {
  Anvil,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Brain,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  FileText,
  Flame,
  GraduationCap,
  Hammer,
  Hash,
  Layers,
  LibraryBig,
  ListChecks,
  Network,
  RotateCcw,
  Save,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  WifiOff,
  X,
} from 'lucide-react'
import { analyzeNotes, SAMPLE_NOTES } from './lib/noteforge.js'

const STORAGE_KEY = 'noteforge-sets-v1'

const SAMPLE_SUBJECTS = {
  'sample-biology': 'Biology notes',
  'sample-economics': 'Economics notes',
  'sample-computer-science': 'Computer Science notes',
}

const VIEWS = [
  { id: 'forge', label: 'Forge', hint: 'Notes in, study pack out', icon: Hammer },
  { id: 'cards', label: 'Flashcards', hint: 'Flip, test, repeat', icon: Layers },
  { id: 'quiz', label: 'Quiz', hint: 'Questions from your notes', icon: ListChecks },
  { id: 'topics', label: 'Topic Map', hint: 'Subjects and key terms', icon: Network },
  { id: 'library', label: 'Library', hint: 'Saved note sets', icon: LibraryBig },
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

function EmptyState({ icon: Icon, title, text, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={26} strokeWidth={1.8} /></span>
      <h4>{title}</h4>
      <p>{text}</p>
      {actionLabel && (
        <button type="button" className="btn primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
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
  const forgeProgress = Math.min(100, Math.round((wordCount / 40) * 100))

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

  const activeView = VIEWS.find((v) => v.id === view)

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><Anvil size={24} strokeWidth={2.2} /></span>
          <div className="brand-text">
            <h1>NoteForge</h1>
            <p>Notes in. Study tools out.</p>
          </div>
        </div>

        <nav className="nav" aria-label="Main">
          {VIEWS.map((v) => {
            const Icon = v.icon
            return (
              <button
                key={v.id}
                type="button"
                className={view === v.id ? 'nav-item active' : 'nav-item'}
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? 'page' : undefined}
              >
                <span className="nav-icon"><Icon size={19} strokeWidth={2} /></span>
                <span className="nav-copy">
                  <span className="nav-label">{v.label}</span>
                  <span className="nav-hint">{v.hint}</span>
                </span>
                {v.id === 'library' && sets.length > 0 && <span className="nav-count">{sets.length}</span>}
              </button>
            )
          })}
        </nav>

        <div className="rail-card">
          <span className="rail-card-icon"><WifiOff size={17} strokeWidth={2} /></span>
          <div>
            <strong>Works fully offline</strong>
            <p>All the machine learning runs in your browser. No account, and your notes never leave this device.</p>
          </div>
        </div>

        <p className="rail-foot">NoteForge by Ibrahim Yahaya, FUTMINNA</p>
      </aside>

      <main className="main">
        <header className="page-head">
          <div>
            <p className="eyebrow">{activeView.label}</p>
            <h2>{activeView.hint}</h2>
          </div>
          {analysis && view !== 'forge' && (
            <span className="head-chip">
              <GraduationCap size={15} strokeWidth={2} />
              {analysis.topTopic ? analysis.topTopic.label : 'General'} pack
            </span>
          )}
        </header>

        {notice && (
          <div className="notice" role="status">
            <CheckCircle2 size={18} strokeWidth={2} className="notice-icon" />
            <span>{notice}</span>
            <button type="button" className="notice-x" onClick={() => setNotice('')} aria-label="Dismiss">
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>
        )}

        {view === 'forge' && (
          <>
            <section className="intro">
              <h3>Paste your lecture notes. NoteForge forges them into study tools.</h3>
              <p>
                TF-IDF finds the key terms, a naive Bayes classifier tags the subject, and the app builds
                flashcards, a quiz and a summary from your own words.
              </p>
              <ul className="intro-points">
                <li><Brain size={16} strokeWidth={2} /> Real ML, running on your device</li>
                <li><Layers size={16} strokeWidth={2} /> Flashcards and quiz from your text</li>
                <li><WifiOff size={16} strokeWidth={2} /> No signal or account needed</li>
              </ul>
            </section>

            <div className="forge-grid">
              <section className="panel editor-panel" aria-label="Forge">
                <div className="panel-head">
                  <h3>1. Add your notes</h3>
                  <span className="word-chip"><FileText size={14} strokeWidth={2} /> {wordCount} words</span>
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
                <div className="forge-meter" aria-hidden="true">
                  <span style={{ width: `${forgeProgress}%` }} />
                </div>
                <div className="forge-bar">
                  <span className="word-count">{canForge ? 'Ready to forge.' : `Add ${40 - wordCount} more word${40 - wordCount === 1 ? '' : 's'} to forge`}</span>
                  <div className="forge-actions">
                    {analysis && (
                      <button type="button" className="btn ghost" onClick={saveSet}>
                        <Save size={16} strokeWidth={2} /> Save to library
                      </button>
                    )}
                    <button type="button" className="btn primary" onClick={handleForge} disabled={!canForge}>
                      <Flame size={16} strokeWidth={2} /> Forge study pack
                    </button>
                  </div>
                </div>
              </section>

              <div className="side-stack">
                <section className="panel side-panel" aria-label="Samples">
                  <h4><Sparkles size={16} strokeWidth={2} /> Try a sample</h4>
                  <p className="side-sub">No notes handy? Load one of these and see the forge at work.</p>
                  <div className="sample-list">
                    {SAMPLE_NOTES.map((s) => (
                      <button key={s.id} type="button" className="sample-item" onClick={() => loadSample(s)}>
                        <span className="sample-icon"><BookOpen size={17} strokeWidth={2} /></span>
                        <span className="sample-copy">
                          <strong>{s.title}</strong>
                          <small>{SAMPLE_SUBJECTS[s.id] || 'Sample notes'}</small>
                        </span>
                        <ArrowRight size={16} strokeWidth={2} className="sample-arrow" />
                      </button>
                    ))}
                  </div>
                </section>

                <section className="panel side-panel" aria-label="How it works">
                  <h4><Brain size={16} strokeWidth={2} /> How the forge works</h4>
                  <ol className="steps">
                    <li><strong>Key terms.</strong> TF-IDF ranks the words that matter most in your notes.</li>
                    <li><strong>Subject tag.</strong> Naive Bayes scores your notes against 8 school subjects.</li>
                    <li><strong>Study pack.</strong> Strong sentences become flashcards and quiz questions.</li>
                  </ol>
                </section>
              </div>
            </div>

            {analysis && (
              <section className="panel pack" aria-label="Study pack">
                <div className="panel-head">
                  <h3>2. Your study pack</h3>
                  <span className="badge"><Target size={13} strokeWidth={2.2} /> {analysis.topTopic ? analysis.topTopic.label : 'General'} {analysis.topTopic ? pct(analysis.topTopic.confidence) : ''}</span>
                </div>
                <div className="stat-grid">
                  <div className="stat"><span className="stat-icon"><FileText size={17} strokeWidth={2} /></span><strong>{analysis.wordCount}</strong><span>words read</span></div>
                  <div className="stat"><span className="stat-icon"><Hash size={17} strokeWidth={2} /></span><strong>{analysis.sentenceCount}</strong><span>sentences</span></div>
                  <div className="stat"><span className="stat-icon"><Clock3 size={17} strokeWidth={2} /></span><strong>{analysis.readingMinutes} min</strong><span>reading time</span></div>
                  <div className="stat"><span className="stat-icon"><Layers size={17} strokeWidth={2} /></span><strong>{analysis.flashcards.length}</strong><span>flashcards</span></div>
                  <div className="stat"><span className="stat-icon"><ListChecks size={17} strokeWidth={2} /></span><strong>{analysis.quiz.length}</strong><span>quiz questions</span></div>
                  <div className="stat"><span className="stat-icon"><GraduationCap size={17} strokeWidth={2} /></span><strong>{analysis.topTopic ? analysis.topTopic.label : '-'}</strong><span>top topic</span></div>
                </div>
                <div className="summary-box">
                  <h4>Summary in 3 sentences</h4>
                  {analysis.summary.map((s, i) => (
                    <p key={i}>{s}</p>
                  ))}
                </div>
                {analysis.keyTerms.length > 0 && (
                  <div className="pack-terms">
                    <span className="pack-terms-label">Key terms found</span>
                    <div className="term-chips">
                      {analysis.keyTerms.slice(0, 10).map((k) => (
                        <span key={k.term} className="term-chip">{k.term}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pack-actions">
                  <button type="button" className="btn primary" onClick={() => setView('cards')}><Layers size={16} strokeWidth={2} /> Study flashcards</button>
                  <button type="button" className="btn" onClick={() => setView('quiz')}><ListChecks size={16} strokeWidth={2} /> Take the quiz</button>
                  <button type="button" className="btn" onClick={() => setView('topics')}><Network size={16} strokeWidth={2} /> See topic map</button>
                </div>
              </section>
            )}
          </>
        )}

        {view === 'cards' && (
          <section className="panel study-panel" aria-label="Flashcards">
            <div className="panel-head">
              <h3>Flashcards</h3>
              {cards.length > 0 && <span className="muted">Card {cardIndex + 1} of {cards.length} - known {knownCount}</span>}
            </div>
            {!card && (
              <EmptyState
                icon={Layers}
                title="No flashcards yet"
                text="Forge a study pack first, or load a sample on the Forge screen."
                actionLabel="Go to Forge"
                onAction={() => setView('forge')}
              />
            )}
            {card && (
              <>
                <div className="progress"><div className="progress-fill" style={{ width: `${cards.length ? (knownCount / cards.length) * 100 : 0}%` }} /></div>
                <button type="button" className={flipped ? 'flashcard flipped' : 'flashcard'} onClick={() => setFlipped((f) => !f)} aria-label="Flashcard, tap to flip">
                  <span className={flipped ? 'flash-tag answer' : 'flash-tag'}>{flipped ? 'Answer' : card.type === 'cloze' ? 'Fill the gap' : 'Define it'}</span>
                  <span className="flash-text">{flipped ? card.back : card.front}</span>
                  <span className="flash-hint">{flipped ? 'Tap to see the question' : 'Tap to reveal the answer'}</span>
                </button>
                <div className="card-actions">
                  <button type="button" className="btn" onClick={() => { setFlipped(false); setCardIndex((i) => Math.max(i - 1, 0)) }} disabled={cardIndex === 0}><ArrowLeft size={16} strokeWidth={2} /> Back</button>
                  <button type="button" className="btn warn" onClick={() => markCard(false)}>Still learning</button>
                  <button type="button" className="btn primary" onClick={() => markCard(true)}><Check size={16} strokeWidth={2.4} /> I know this</button>
                  <button type="button" className="btn" onClick={() => { setFlipped(false); setCardIndex((i) => Math.min(i + 1, cards.length - 1)) }} disabled={cardIndex >= cards.length - 1}>Next <ArrowRight size={16} strokeWidth={2} /></button>
                </div>
                <p className="muted center">{knownCount} of {cards.length} marked as known</p>
              </>
            )}
          </section>
        )}

        {view === 'quiz' && (
          <section className="panel study-panel" aria-label="Quiz">
            <div className="panel-head">
              <h3>Quiz</h3>
              {quiz.length > 0 && !quizDone && <span className="muted">Question {quizIndex + 1} of {quiz.length} - score {score}</span>}
            </div>
            {quiz.length === 0 && (
              <EmptyState
                icon={CircleHelp}
                title="No quiz yet"
                text="Forge a study pack first, or load a sample on the Forge screen."
                actionLabel="Go to Forge"
                onAction={() => setView('forge')}
              />
            )}
            {question && !quizDone && (
              <>
                <div className="progress"><div className="progress-fill" style={{ width: `${(quizIndex / quiz.length) * 100}%` }} /></div>
                <p className="quiz-q">{question.question}</p>
                <div className="quiz-options">
                  {question.options.map((option, i) => {
                    let cls = 'quiz-option'
                    if (picked && option === question.answer) cls += ' correct'
                    else if (picked && option === picked) cls += ' wrong'
                    return (
                      <button key={option} type="button" className={cls} onClick={() => pickOption(option)} disabled={Boolean(picked)}>
                        <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                        <span className="option-text">{option}</span>
                        {picked && option === question.answer && <Check size={17} strokeWidth={2.4} className="option-mark" />}
                        {picked && option === picked && option !== question.answer && <X size={17} strokeWidth={2.4} className="option-mark" />}
                      </button>
                    )
                  })}
                </div>
                {picked && (
                  <div className={picked === question.answer ? 'quiz-feedback good' : 'quiz-feedback bad'}>
                    <p>{picked === question.answer ? 'Correct. Well done.' : `Not quite. The answer is ${question.answer}.`}</p>
                    <button type="button" className="btn primary" onClick={nextQuestion}>
                      {quizIndex + 1 >= quiz.length ? 'See result' : 'Next question'} <ArrowRight size={16} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </>
            )}
            {quizDone && (
              <div className="quiz-result">
                <span className="result-icon"><Trophy size={30} strokeWidth={1.8} /></span>
                <p className="big-score">{score} / {quiz.length}</p>
                <p>{score === quiz.length ? 'Perfect score. You know these notes well.' : score >= quiz.length / 2 ? 'Good work. Review the flashcards for the ones you missed.' : 'Keep going. Study the flashcards, then try again.'}</p>
                <div className="result-actions">
                  <button type="button" className="btn primary" onClick={restartQuiz}><RotateCcw size={16} strokeWidth={2} /> Retake quiz</button>
                  <button type="button" className="btn" onClick={() => setView('cards')}><Layers size={16} strokeWidth={2} /> Review flashcards</button>
                </div>
              </div>
            )}
          </section>
        )}

        {view === 'topics' && (
          <section className="panel" aria-label="Topic Map">
            <div className="panel-head"><h3>Topic Map</h3></div>
            {!analysis && (
              <EmptyState
                icon={Network}
                title="No topic map yet"
                text="Forge a study pack first, or load a sample on the Forge screen."
                actionLabel="Go to Forge"
                onAction={() => setView('forge')}
              />
            )}
            {analysis && (
              <div className="topic-grid">
                <div className="topic-box">
                  <h4>Subject match (naive Bayes)</h4>
                  {analysis.topics.map((t, i) => (
                    <div key={t.label} className={i === 0 ? 'topic-row top' : 'topic-row'}>
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
            {sets.length === 0 && (
              <EmptyState
                icon={Bookmark}
                title="Nothing saved yet"
                text="Forge a study pack, then choose Save to library to keep it here on this device."
                actionLabel="Go to Forge"
                onAction={() => setView('forge')}
              />
            )}
            <div className="set-list">
              {sets.map((s) => (
                <article key={s.id} className="set-card">
                  <div className="set-top">
                    <span className="set-icon"><BookOpen size={18} strokeWidth={2} /></span>
                    <span className="badge soft">{s.topTopic}</span>
                  </div>
                  <h4>{s.title}</h4>
                  <p className="set-meta"><Layers size={14} strokeWidth={2} /> {s.cardCount} flashcards</p>
                  <p className="set-meta"><ListChecks size={14} strokeWidth={2} /> {s.quizCount} quiz questions</p>
                  <p className="set-meta"><Clock3 size={14} strokeWidth={2} /> Saved {new Date(s.savedAt).toLocaleDateString()}</p>
                  <div className="set-actions">
                    <button type="button" className="btn primary" onClick={() => openSet(s)}>Open</button>
                    <button type="button" className="btn ghost danger" onClick={() => deleteSet(s.id)}><Trash2 size={15} strokeWidth={2} /> Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="foot">
          <p>Built for the ML Empowerment Build Challenge 4.0. All machine learning runs locally in your browser, so your notes stay yours.</p>
        </footer>
      </main>
    </div>
  )
}
