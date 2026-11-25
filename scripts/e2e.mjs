// End-to-end checks for NoteForge. Serves dist/ locally, drives every
// screen with Playwright, fails on any console error, and saves the
// 6 documentation screenshots into docs/.
// Run after `npm run build`:  node scripts/e2e.mjs
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome'
const ROOT = new URL('..', import.meta.url).pathname
const DIST = join(ROOT, 'dist')
const DOCS = join(ROOT, 'docs')
await mkdir(DOCS, { recursive: true })

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
}

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path === '/') path = '/index.html'
  try {
    const body = await readFile(join(DIST, normalize(path)))
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`

let passed = 0
let failed = 0
function check(name, ok) {
  if (ok) { passed++; console.log(`ok - ${name}`) }
  else { failed++; console.log(`FAIL - ${name}`) }
}

const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto(base, { waitUntil: 'networkidle' })
check('page loads with NoteForge heading', await page.getByRole('heading', { name: 'NoteForge', exact: true }).isVisible())
check('forge button disabled with empty notes', await page.getByRole('button', { name: 'Forge study pack' }).isDisabled())

await page.getByRole('button', { name: 'Photosynthesis and Respiration' }).click()
await page.waitForTimeout(300)
check('sample loads notes into textarea', (await page.locator('textarea').inputValue()).includes('Photosynthesis'))
check('notice reports top topic Biology', (await page.locator('.notice').innerText()).includes('Biology'))
check('stat grid shows flashcards count', await page.locator('.stat-grid').isVisible())
check('summary box shows 3 sentences', (await page.locator('.summary-box p').count()) >= 3)
await page.screenshot({ path: join(DOCS, '1-forge.png'), fullPage: true })

await page.getByRole('button', { name: 'Study flashcards' }).click()
await page.waitForTimeout(200)
check('flashcard visible', await page.locator('.flashcard').isVisible())
const frontText = await page.locator('.flash-text').innerText()
await page.locator('.flashcard').click()
await page.waitForTimeout(150)
const backText = await page.locator('.flash-text').innerText()
check('flashcard flips to a different side', frontText !== backText)
await page.getByRole('button', { name: 'I know this' }).click()
await page.waitForTimeout(150)
check('known counter updates', (await page.locator('.panel').innerText()).includes('1 of'))
await page.screenshot({ path: join(DOCS, '2-flashcards.png'), fullPage: true })

await page.getByRole('button', { name: /Quiz/ }).first().click()
await page.waitForTimeout(200)
check('quiz question visible', await page.locator('.quiz-q').isVisible())
check('quiz has 4 options', (await page.locator('.quiz-option').count()) === 4)
await page.locator('.quiz-option').first().click()
await page.waitForTimeout(150)
check('quiz feedback appears after picking', await page.locator('.quiz-feedback').isVisible())
await page.screenshot({ path: join(DOCS, '3-quiz.png'), fullPage: true })
await page.getByRole('button', { name: 'Next question' }).click()
await page.waitForTimeout(150)
check('quiz advances to question 2', (await page.locator('.panel-head').innerText()).includes('Question 2'))

await page.getByRole('button', { name: /Topic Map/ }).click()
await page.waitForTimeout(200)
check('topic map shows 8 subjects', (await page.locator('.topic-row').count()) === 8)
check('key terms listed', (await page.locator('.term').count()) >= 8)
check('Biology is top topic at 100% band', (await page.locator('.topic-row').first().innerText()).includes('Biology'))
await page.screenshot({ path: join(DOCS, '4-topic-map.png'), fullPage: true })

await page.getByRole('button', { name: /Forge/ }).first().click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: 'Save to library' }).click()
await page.waitForTimeout(150)
check('save notice appears', (await page.locator('.notice').innerText()).includes('Saved'))
await page.getByRole('button', { name: /Library/ }).click()
await page.waitForTimeout(200)
check('library shows saved set', (await page.locator('.set-card').count()) === 1)
await page.screenshot({ path: join(DOCS, '5-library.png'), fullPage: true })

await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: /Library/ }).click()
await page.waitForTimeout(200)
check('saved set survives reload (localStorage)', (await page.locator('.set-card').count()) === 1)
await page.getByRole('button', { name: 'Open' }).click()
await page.waitForTimeout(200)
check('opening a set restores the notes', (await page.locator('textarea').inputValue()).includes('Photosynthesis'))

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
mobile.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
mobile.on('pageerror', (err) => errors.push(String(err)))
await mobile.goto(base, { waitUntil: 'networkidle' })
await mobile.getByRole('button', { name: 'Demand, Supply and Markets' }).click()
await mobile.waitForTimeout(300)
check('mobile: sample forges', (await mobile.locator('.notice').innerText()).includes('Economics'))
await mobile.screenshot({ path: join(DOCS, '6-mobile.png'), fullPage: true })

check('zero console errors', errors.length === 0)
if (errors.length) console.log('console errors:', errors)

await browser.close()
server.close()
console.log(`\nE2E: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
