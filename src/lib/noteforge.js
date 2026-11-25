// NoteForge core logic.
// Pure functions only: no DOM, no storage, no network.
// Everything runs in the browser: TF-IDF key-term extraction,
// extractive summarisation, a naive Bayes topic classifier,
// and flashcard and quiz generation from the student's own notes.

export const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
  'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to',
  'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'again', 'further', 'once', 'here', 'there', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can',
  'will', 'just', 'should', 'now', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did',
  'doing', 'would', 'could', 'shall', 'may', 'might', 'must', 'ought',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'his', 'her',
  'its', 'our', 'their', 'this', 'that', 'these', 'those', 'am', 'as',
  'of', 'also', 'which', 'who', 'whom', 'what', 'where', 'why', 'how',
  'because', 'until', 'while', 'per', 'via', 'one', 'two', 'first',
])

export function tokenize(text) {
  if (!text) return []
  return text.toLowerCase().match(/[a-z0-9]+/g) || []
}

export function contentTokens(text) {
  return tokenize(text).filter((t) => t.length >= 3 && !STOPWORDS.has(t))
}

export function splitSentences(text) {
  if (!text) return []
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const parts = clean.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || []
  return parts.map((s) => s.trim()).filter((s) => s.length >= 12)
}

export function termCounts(tokens) {
  const counts = new Map()
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1)
  return counts
}

// TF-IDF where each sentence is treated as one document.
// Returns a Map of term -> score, normalised so the top term is 1.
export function computeTfIdf(text) {
  const sentences = splitSentences(text)
  const docs = sentences.map((s) => contentTokens(s))
  const allTokens = docs.flat()
  const tf = termCounts(allTokens)
  const total = Math.max(allTokens.length, 1)
  const docCount = Math.max(docs.length, 1)

  const df = new Map()
  for (const doc of docs) {
    for (const term of new Set(doc)) df.set(term, (df.get(term) || 0) + 1)
  }

  const scores = new Map()
  for (const [term, count] of tf) {
    const idf = Math.log(1 + docCount / (1 + (df.get(term) || 0)))
    scores.set(term, (count / total) * idf)
  }

  const max = Math.max(...scores.values(), 0)
  if (max > 0) {
    for (const [term, score] of scores) scores.set(term, score / max)
  }
  return { scores, counts: tf }
}

export function extractKeyTerms(text, limit = 12) {
  const { scores, counts } = computeTfIdf(text)
  return [...scores.entries()]
    .map(([term, score]) => ({ term, score, count: counts.get(term) || 0 }))
    .sort((a, b) => b.score - a.score || b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, limit)
}

// Score each sentence by the TF-IDF weight of its terms,
// softened by sentence length so long sentences do not always win.
export function rankSentences(text) {
  const { scores } = computeTfIdf(text)
  return splitSentences(text)
    .map((sentence, index) => {
      const tokens = contentTokens(sentence)
      const sum = tokens.reduce((acc, t) => acc + (scores.get(t) || 0), 0)
      const score = tokens.length ? sum / Math.sqrt(tokens.length) : 0
      return { sentence, index, score }
    })
    .sort((a, b) => b.score - a.score)
}

export function summarize(text, count = 3) {
  return rankSentences(text)
    .slice(0, count)
    .sort((a, b) => a.index - b.index)
    .map((s) => s.sentence)
}

// ---------------------------------------------------------------------
// Naive Bayes topic classifier.
// Trained at load on a small built-in corpus of short subject notes.
// Multinomial naive Bayes with Laplace smoothing.

export const SUBJECTS = [
  'Biology', 'Chemistry', 'Physics', 'Economics',
  'History', 'Computer Science', 'Mathematics', 'Literature',
]

export const TRAINING_DOCS = [
  { label: 'Biology', text: 'The cell is the basic unit of life. Mitochondria produce energy through respiration. Chloroplasts carry out photosynthesis in plant cells. DNA carries genetic information and genes control inherited traits. Enzymes speed up chemical reactions in the body. Organisms adapt to their environment through natural selection and evolution.' },
  { label: 'Biology', text: 'Photosynthesis converts sunlight water and carbon dioxide into glucose and oxygen. Plants absorb water through roots and minerals from the soil. The heart pumps blood around the body through arteries and veins. Bacteria and viruses can cause disease in humans and animals. The digestive system breaks food into nutrients.' },
  { label: 'Biology', text: 'Genetics studies heredity and variation in organisms. Chromosomes are made of DNA and protein. Meiosis produces gametes with half the number of chromosomes. Ecosystems include producers consumers and decomposers. Predators hunt prey and food chains transfer energy between species.' },
  { label: 'Chemistry', text: 'Atoms consist of protons neutrons and electrons. The periodic table arranges elements by atomic number. Chemical reactions rearrange atoms to form new substances. Acids donate protons and bases accept them. The mole is a unit for counting particles in a substance.' },
  { label: 'Chemistry', text: 'Covalent bonds share electrons between atoms while ionic bonds transfer electrons. Oxidation is the loss of electrons and reduction is the gain. Titration measures the concentration of a solution. Hydrocarbons contain carbon and hydrogen atoms. Catalysts speed up reactions without being used up.' },
  { label: 'Chemistry', text: 'The pH scale measures how acidic or alkaline a solution is. Electrolysis uses electricity to decompose compounds. Metals react with oxygen to form oxides. Balancing equations keeps the same number of atoms on each side. Salts form when an acid reacts with a base.' },
  { label: 'Physics', text: 'Velocity is speed in a given direction and acceleration is the rate of change of velocity. Newton laws describe how forces affect motion. Energy cannot be created or destroyed only transferred. Electric current flows through a circuit when there is a potential difference. Waves transfer energy without transferring matter.' },
  { label: 'Physics', text: 'Friction opposes motion between surfaces in contact. Gravity pulls objects toward the centre of the Earth. Pressure is force divided by area. Light reflects off surfaces and refracts when it passes between materials. Magnets attract iron steel nickel and cobalt.' },
  { label: 'Physics', text: 'Kinetic energy depends on mass and velocity. A lever multiplies force using a pivot. Sound travels as vibrations through air water and solids. Resistance opposes the flow of electric current in a wire. The frequency of a wave is measured in hertz.' },
  { label: 'Economics', text: 'Demand is the quantity buyers want at a given price and supply is the quantity sellers offer. When price rises demand usually falls. Markets reach equilibrium where supply equals demand. Inflation is a general rise in prices over time. Governments use taxation and spending to manage the economy.' },
  { label: 'Economics', text: 'Opportunity cost is the next best alternative given up when a choice is made. Scarcity means resources are limited while wants are unlimited. Monopoly is a market with a single seller. GDP measures the total value of goods and services produced in a country. Unemployment rises during a recession.' },
  { label: 'Economics', text: 'Elasticity measures how much demand changes when price changes. Firms aim to maximise profit by controlling costs and revenue. Interest rates affect borrowing saving and investment. Trade allows countries to specialise in what they produce best. Budgets plan income against expenditure.' },
  { label: 'History', text: 'The empire expanded through conquest and trade over several centuries. Ancient civilisations built cities along great rivers. The war began after years of tension between rival kingdoms. Colonial rule changed the political structure of the region. Independence movements demanded freedom from foreign control.' },
  { label: 'History', text: 'The revolution overthrew the old monarchy and created a republic. Historians use primary sources such as letters diaries and official records. The treaty ended the conflict and redrew national borders. Trade routes connected distant continents and cultures. The dynasty ruled for three hundred years.' },
  { label: 'History', text: 'Agriculture allowed people to settle in permanent villages. The printing press spread books and ideas across Europe. Explorers mapped new sea routes to Asia and the Americas. The civil war divided the country over the question of slavery. Archaeologists excavate ruins to learn about the past.' },
  { label: 'Computer Science', text: 'An algorithm is a step by step procedure for solving a problem. Variables store data values in a program. Loops repeat a block of code while a condition is true. Functions group instructions that can be reused. Binary represents data using only zeros and ones.' },
  { label: 'Computer Science', text: 'Databases store structured information in tables of rows and columns. Networks connect computers so they can share data and resources. The CPU fetches decodes and executes instructions. Sorting algorithms arrange data in order. Encryption protects information by scrambling it with a key.' },
  { label: 'Computer Science', text: 'Arrays hold lists of values under one name. Recursion is when a function calls itself. The internet is a global network of networks using common protocols. Operating systems manage hardware and run applications. Testing finds bugs before software is released.' },
  { label: 'Mathematics', text: 'A fraction represents part of a whole with a numerator and a denominator. The area of a triangle is half base times height. Algebra uses symbols to represent unknown values in equations. Prime numbers have exactly two factors. The gradient of a line measures its steepness.' },
  { label: 'Mathematics', text: 'Probability measures how likely an event is to happen. Angles in a triangle add up to one hundred and eighty degrees. Ratios compare quantities in proportion. Sequences follow rules to generate terms. The mean is found by adding values and dividing by how many there are.' },
  { label: 'Mathematics', text: 'Pythagoras theorem relates the sides of a right angled triangle. Percentages are fractions out of one hundred. Coordinates locate points on a grid using x and y values. Simultaneous equations are solved together to find unknown values. Volume measures the space inside a solid.' },
  { label: 'Literature', text: 'The novel follows a young hero on a journey of self discovery. Metaphors compare one thing to another without using like or as. The poet uses imagery to create pictures in the reader mind. Characters develop through conflict and dialogue. The narrator tells the story from a first person viewpoint.' },
  { label: 'Literature', text: 'Shakespeare wrote plays that explore ambition love and power. A stanza is a group of lines in a poem. Themes are the central ideas a writer explores. Irony occurs when the opposite of what is expected happens. The setting establishes time and place for the story.' },
  { label: 'Literature', text: 'Prose is ordinary written language without metrical structure. Alliteration repeats consonant sounds at the start of words. The protagonist faces a moral dilemma in the final chapter. Symbolism uses objects to represent deeper meanings. Essays present arguments supported by evidence from the text.' },
]

export function trainNaiveBayes(docs) {
  const labels = [...new Set(docs.map((d) => d.label))]
  const vocab = new Set()
  const labelCounts = new Map()
  const wordCounts = new Map()
  const totalWords = new Map()

  for (const label of labels) {
    labelCounts.set(label, 0)
    wordCounts.set(label, new Map())
    totalWords.set(label, 0)
  }
  for (const doc of docs) {
    labelCounts.set(doc.label, labelCounts.get(doc.label) + 1)
    const tokens = contentTokens(doc.text)
    for (const t of tokens) {
      vocab.add(t)
      const wc = wordCounts.get(doc.label)
      wc.set(t, (wc.get(t) || 0) + 1)
      totalWords.set(doc.label, totalWords.get(doc.label) + 1)
    }
  }
  return { labels, vocab, labelCounts, wordCounts, totalWords, docTotal: docs.length }
}

export function classifyTopics(model, text) {
  const tokens = contentTokens(text)
  const vocabSize = Math.max(model.vocab.size, 1)
  const logScores = model.labels.map((label) => {
    let score = Math.log(model.labelCounts.get(label) / model.docTotal)
    const wc = model.wordCounts.get(label)
    const denom = model.totalWords.get(label) + vocabSize
    for (const t of tokens) {
      score += Math.log(((wc.get(t) || 0) + 1) / denom)
    }
    return { label, logScore: score }
  })
  const max = Math.max(...logScores.map((s) => s.logScore))
  const exps = logScores.map((s) => Math.exp(s.logScore - max))
  const sum = exps.reduce((a, b) => a + b, 0) || 1
  return logScores
    .map((s, i) => ({ label: s.label, confidence: exps[i] / sum }))
    .sort((a, b) => b.confidence - a.confidence)
}

let cachedModel = null
export function topicModel() {
  if (!cachedModel) cachedModel = trainNaiveBayes(TRAINING_DOCS)
  return cachedModel
}

// ---------------------------------------------------------------------
// Flashcard and quiz generation.

export function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffled(items, rand) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function blankOut(sentence, term) {
  const re = new RegExp(`\\b${term}\\b`, 'i')
  return sentence.replace(re, '_____')
}

function titleCase(term) {
  return term.charAt(0).toUpperCase() + term.slice(1)
}

// Cloze cards: a strong sentence with one key term blanked out.
// Definition cards: sentences of the form "X is ..." become "What is X?".
export function makeFlashcards(text, limit = 12) {
  const keyTerms = extractKeyTerms(text, 16).map((k) => k.term)
  const ranked = rankSentences(text)
  const cards = []
  const usedTerms = new Set()

  for (const { sentence } of ranked) {
    if (cards.length >= limit) break
    const defMatch = sentence.match(/^([A-Z][A-Za-z0-9 ]{2,40}?)\s+(is|are|means|refers to)\s+/i)
    if (defMatch) {
      const subject = defMatch[1].trim()
      const key = subject.toLowerCase()
      if (!usedTerms.has(key)) {
        usedTerms.add(key)
        cards.push({ type: 'definition', front: `What is ${subject.toLowerCase()}?`, back: sentence, term: key })
        continue
      }
    }
    const term = keyTerms.find(
      (t) => !usedTerms.has(t) && new RegExp(`\\b${t}\\b`, 'i').test(sentence),
    )
    if (term) {
      usedTerms.add(term)
      cards.push({ type: 'cloze', front: blankOut(sentence, term), back: titleCase(term), term })
    }
  }
  return cards
}

// Multiple choice questions built from cloze sentences.
// Distractors are other key terms from the same notes.
export function makeQuiz(text, limit = 8) {
  const keyTerms = extractKeyTerms(text, 20).map((k) => k.term)
  if (keyTerms.length < 4) return []
  const ranked = rankSentences(text)
  const rand = mulberry32(hashSeed(text))
  const questions = []
  const usedTerms = new Set()

  for (const { sentence } of ranked) {
    if (questions.length >= limit) break
    const term = keyTerms.find(
      (t) => !usedTerms.has(t) && new RegExp(`\\b${t}\\b`, 'i').test(sentence),
    )
    if (!term) continue
    usedTerms.add(term)
    const distractors = shuffled(keyTerms.filter((t) => t !== term), rand).slice(0, 3)
    const options = shuffled([term, ...distractors], rand).map(titleCase)
    questions.push({
      question: blankOut(sentence, term),
      options,
      answer: titleCase(term),
      term,
    })
  }
  return questions
}

export function analyzeNotes(text) {
  const words = tokenize(text)
  const sentences = splitSentences(text)
  const keyTerms = extractKeyTerms(text, 12)
  const topics = classifyTopics(topicModel(), text)
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    readingMinutes: Math.max(1, Math.round(words.length / 180)),
    keyTerms,
    summary: summarize(text, 3),
    topics,
    topTopic: topics[0] || null,
    flashcards: makeFlashcards(text),
    quiz: makeQuiz(text),
  }
}

export const SAMPLE_NOTES = [
  {
    id: 'sample-biology',
    title: 'Photosynthesis and Respiration',
    text: `Photosynthesis is the process by which green plants make their own food using sunlight, water and carbon dioxide. The green pigment chlorophyll, found inside chloroplasts, traps light energy from the sun. During photosynthesis, plants take in carbon dioxide from the air through tiny holes in their leaves called stomata. The plant uses the trapped light energy to convert carbon dioxide and water into glucose, a sugar that stores chemical energy. Oxygen is released as a waste product of photosynthesis, which is why forests are important for the air we breathe. The rate of photosynthesis depends on light intensity, temperature and the concentration of carbon dioxide. Farmers use this knowledge in greenhouses, where extra light and carbon dioxide help crops grow faster. Respiration is the process that releases energy from glucose inside cells. In aerobic respiration, glucose reacts with oxygen to produce carbon dioxide, water and energy. The energy released by respiration is used for movement, growth and keeping the body warm. Mitochondria are the structures inside cells where most respiration takes place. Plants respire all the time, day and night, even though photosynthesis only happens in daylight. The balance between photosynthesis and respiration controls the levels of oxygen and carbon dioxide in the atmosphere.`,
  },
  {
    id: 'sample-economics',
    title: 'Demand, Supply and Markets',
    text: `Demand is the quantity of a good that buyers are willing and able to buy at a given price. The law of demand states that when the price of a good rises, the quantity demanded usually falls. Supply is the quantity of a good that sellers are willing to offer at a given price. When the price rises, producers are willing to supply more because profit margins improve. A market reaches equilibrium when the quantity demanded equals the quantity supplied. At the equilibrium price, there is no shortage and no surplus of the good. If price is set above equilibrium, a surplus develops and sellers must cut prices to clear stock. If price is set below equilibrium, a shortage develops and buyers compete for limited goods. Elasticity measures how strongly demand responds to a change in price. Goods with many substitutes, like different brands of soap, tend to have elastic demand. Goods with few substitutes, like fuel for transport, tend to have inelastic demand. Governments sometimes set price controls, but a maximum price below equilibrium usually creates shortages. Understanding demand and supply helps businesses set prices and helps governments predict the effect of taxes.`,
  },
  {
    id: 'sample-cs',
    title: 'Algorithms and Data',
    text: `An algorithm is a precise set of instructions for solving a problem or completing a task. Computers follow algorithms exactly, so every step must be clear and unambiguous. Variables are named storage locations that hold data values while a program runs. A loop repeats a block of instructions until a condition becomes false. Selection allows a program to choose between different paths using if statements. Functions are reusable blocks of code that take inputs and return outputs. Arrays store ordered lists of values that can be accessed by an index. Sorting algorithms arrange data into order, for example from smallest to largest. Bubble sort repeatedly swaps neighbouring values that are out of order. Binary search finds a value in a sorted list by halving the search space each step. Databases store structured data in tables made of rows and columns. A primary key uniquely identifies each record in a database table. Encryption scrambles data using a key so that only authorised users can read it. Testing checks that a program produces correct output for a range of inputs, including edge cases.`,
  },
]
