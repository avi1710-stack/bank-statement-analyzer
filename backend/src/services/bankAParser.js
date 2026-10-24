// Parser for statements from "Bank A".
//
// The layout it expects (this is what gets pasted or uploaded):
//
//   BANK A STATEMENT
//   Account Number: XXXX1234
//   Opening Balance: 50000.00
//
//   Date,Description,Debit,Credit,Balance
//   01-10-2026,SALARY ACME PVT LTD OCT,,85000.00,135000.00
//   02-10-2026,UPI PAYMENT GROCERY STORE,1250.50,,133749.50
//
// Lines that do not start with a date (like "Closing Balance") are skipped.

import { HttpError, normalizeDate, parseAmount } from '../utils.js';

const FIRST_LINE_SIGNATURE = /^BANK A\b/i;
const HEADER_ROW = /^date\s*,\s*description\s*,\s*debit\s*,\s*credit\s*,\s*balance\s*$/i;
const OPENING_BALANCE = /^opening balance\s*:\s*([-\d,.]+)/i;

// True if the first non-empty line says "BANK A".
export function looksLikeBankA(text) {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== '');
  return Boolean(firstLine && FIRST_LINE_SIGNATURE.test(firstLine));
}

// Returns { openingBalance, transactions }.
export function parseBankA(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());

  const headerIndex = lines.findIndex((line) => HEADER_ROW.test(line));
  if (headerIndex === -1) {
    throw new HttpError(
      400,
      'Bank A statement: the header row "Date,Description,Debit,Credit,Balance" was not found.'
    );
  }

  const openingBalance = findOpeningBalance(lines.slice(0, headerIndex));
  const transactions = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') continue;

    const cells = splitCsvLine(line).map((cell) => cell.trim());
    const date = normalizeDate(cells[0]);
    if (!date) continue; // footer lines such as "Closing Balance: ..." are skipped

    try {
      transactions.push({
        date,
        description: cells[1] ?? '',
        debit: parseAmount(cells[2]),
        credit: parseAmount(cells[3]),
        // An empty balance cell means "not shown on this row", which is different from 0.
        balance: cells[4] ? parseAmount(cells[4]) : null,
      });
    } catch (err) {
      throw new HttpError(400, `Bank A statement, line ${i + 1}: ${err.message}.`);
    }
  }

  if (transactions.length === 0) {
    throw new HttpError(400, 'Bank A statement: no transaction rows were found under the header.');
  }

  return { openingBalance, transactions };
}

function findOpeningBalance(linesBeforeHeader) {
  for (const line of linesBeforeHeader) {
    const match = line.match(OPENING_BALANCE);
    if (match) return parseAmount(match[1]);
  }
  return null;
}

// Splits one CSV line into cells. Handles quoted cells such as "ELECTRICITY, JULY".
function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; // two quotes in a row mean one literal quote
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}
