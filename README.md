# Bank Statement Analyzer

A small web app. Paste or upload a bank statement and it will:

- read the transactions,
- total the money in and out,
- find salary, EMI payments, cash deposits and bounced rows (`RTN`),
- check that every balance adds up, and show any row that does not in red.

The app runs without an AI key. Bank A statements are read by a parser written for them. Anything else goes to an AI model, or to a simple built-in reader when no key is set.

Stack: React + Vite (frontend, plain CSS), Node.js + Express (backend), JavaScript, and a JSON file for storage.

---

## Quick start

You need Node.js 22 (Node 20.19 or newer also works, since Vite needs it).

### 1. Start the backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The API runs at `http://localhost:3001`. The default `.env` sets `MOCK_LLM=true`, so no key is needed.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend sends `/api` requests to the backend through Vite's proxy, so no CORS setup is needed.

### Using a real AI key

Open `backend/.env`, set `MOCK_LLM=false` and add your key:

```
MOCK_LLM=false
ANTHROPIC_API_KEY=your-key-here
AI_MODEL=claude-haiku-5-5
```

Restart the backend. The key stays on the server and is never sent to the browser.

### Run the tests

```bash
cd backend
npm test
```

The tests use Node's built-in test runner, so nothing extra needs installing.

---

## Try it

Two sample statements are in `samples/`:

- `bank_a.txt` is read by the Bank A parser. It has 10 rows and no balance problems.
- `bank_e.txt` is read by the AI path (the built-in reader if no key is set). One balance is wrong on 8 October 2026, so that row shows in red.

Paste either file into the text box, or use "Upload a text file".

---

## API

| Method | Route | What it does |
| --- | --- | --- |
| `POST` | `/api/statements` | Body: `{ "text": "...", "name": "optional" }`. Analyses and saves the statement. Returns it in full with status 201. |
| `GET` | `/api/statements` | Lists saved statements, newest first. Returns summaries only. |
| `GET` | `/api/statements/:id` | Returns one statement with every transaction row. |

Example:

```bash
curl -X POST localhost:3001/api/statements \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Oct Bank A\",\"text\":$(node -e "console.log(JSON.stringify(require('fs').readFileSync('../samples/bank_a.txt','utf8')))")}"
```

Errors come back as JSON with an `error` message, for example `400` for a bad Bank A row or `404` for an unknown id.

---

## How it works

Every statement goes through the same five steps:

1. **Read.** If the first line says `BANK A`, the Bank A parser reads it. Otherwise the AI reads it (or the built-in reader, with `MOCK_LLM=true`). AI output must be valid JSON in the agreed shape. If it is not, the app asks once more, then stops with a clear error.
2. **Check balances.** For each row: previous shown balance + money in − money out should equal the balance shown on the row. Rows that do not add up are flagged. Each row is checked against the previous *shown* balance, so one wrong row does not flag every row after it.
3. **Tag rows.** `salary` (credit rows containing SALARY), `emi` (debit rows with EMI as a whole word), `cash_deposit` (credit rows containing CASH DEP), `bounce` (rows containing RTN).
4. **Summarise.** Totals are added up in code, in paise (whole cents), so decimal rounding cannot cause a false mismatch.
5. **Save.** The statement goes into `backend/data/statements.json`.

### Project layout

```
backend/
  src/
    server.js                 Express setup and error handling
    routes/statements.js      The three API routes
    services/
      statementService.js     Runs the five steps above
      bankAParser.js          Reads Bank A statements
      aiParser.js             Calls the AI, validates its JSON, retries once
      mockAi.js               Simple built-in reader used when MOCK_LLM=true
      analyze.js              Balance check, tagging and summary (plain code)
      store.js                Saves and loads statements from a JSON file
    utils.js                  Money and date helpers
  test/                       Unit tests (npm test)
frontend/
  src/
    App.jsx                   Page layout and state
    api.js                    All calls to the backend
    components/               Form, summary, transaction table, past statements
    styles.css                Plain CSS
samples/                      Example statements
```

---

## My thoughts

### Why the totals are calculated in code, not by the AI

The totals and balance checks have to be exact, and the same statement should always give the same answer. An AI can skip a row, miscount, or add up wrongly, and it cannot show its working. A balance check is simple arithmetic, so code does it exactly, and a reviewer can see why a row is red.

The split is: the AI reads messy text, the code does the maths. The AI's output is also checked by code before we trust it. We use the code's balance check to catch AI mistakes, rather than asking the AI whether it made any.

### If a bank we have never seen shows up next week

It still works, because the AI path handles any layout. The balance check runs on that output too, so a misread row usually shows up as a red row. A missing row or a wrong amount breaks the running balance, which is why the check catches most errors. It does not catch everything: if the AI misreads an amount and the balance on the same row in a matching way, the check passes. The summary shows which path read each statement, so a reviewer knows when to look more closely.

For a bank we see often, the better fix is a parser for its layout, which is a small file like `bankAParser.js` plus a sample for the tests. The AI stays as the fallback.

### How it could get better over time

- **Learn from corrections.** If a user fixes a row, keep that fix and use the corrected rows as examples in the AI prompt, or as the basis for a new parser.
- **Watch the failure rate.** Count how often each bank's statements fail the balance check. A sudden rise means a bank changed its layout, and we would see it straight away.
- **Keep a sample for every layout.** Each new layout gets a sample file and a test, so a future change cannot break it without a test failing.
- **Let users fix and re-check.** A row can be edited and the balance check run again. This is optional and not built yet.
- **Move to SQLite** when we need search, several users, or safe writes at the same time.

---

## Limitations

- **The Bank A format is assumed.** The Bank A files were not available when this was written, so `samples/bank_a.txt` is a made-up file in the layout the parser expects. Check the parser against the real `bank_a.txt` and adjust `bankAParser.js` if the layout differs.
- **The built-in reader is basic.** It only understands lines that start with a date and end with one or two amounts. It exists so the app runs without a key. Use the AI for anything more complicated.
- **Storage is a JSON file.** It has no locking, so two saves at the same moment could overwrite each other. Fine for development, not for production.
- **No login.** Bank statements contain personal data. Before real use, add authentication, encrypt stored data, and set a retention policy. The app does not store the raw statement text, only the parsed rows.
