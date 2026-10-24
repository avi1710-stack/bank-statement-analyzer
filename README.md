# Bank Statement Analyzer

A simple web app built for a technical assignment. It reads bank statements, shows transactions, calculates totals, and finds balance errors.

## Features

- Parse bank statements
- Show all transactions
- Calculate total money in and out
- Detect balance mismatches
- Identify salary, EMI, cash deposits, and RTN
- View previously analyzed statements
- Mock AI mode for testing without an API key

## Tech Stack

- **Frontend:** React, Vite, CSS
- **Backend:** Node.js, Express
- **Language:** JavaScript
- **Storage:** In-memory

## How to Run

**Backend**
```bash
cd backend
npm install
npm start
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## How It Works

Bank A is parsed using JavaScript. The app also supports Ai based parsing for other statement formats.

After parsing, all calculations are done in Javascript.

Balance is checked using:

`Previous Balance + Credit - Debit = Current Balance`

If the numbers dont match, the transaction is flagged.

## Why I Used Code for Calculations

AI is useful for reading different statement formats, but calculations are more reliable when handled by code.

## Testing

Run the tests using:

```bash
cd backend
npm test
```

## Future Improvements

- Support more banks
- Add PDF and CSV uploads
- Improve error handling
- Store statements in a database

