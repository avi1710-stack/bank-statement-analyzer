// A simple stand-in for the AI, used when MOCK_LLM=true.
// It lets the whole app run without an API key, so it is deliberately basic.
//
// It looks for lines that START with a date and END with one or two amounts:
//   2026-10-03 UPI PAYMENT TO SHOP 450.00 12,300.00
//   (amount first, then the running balance if it is shown)
//
// Money in or out comes from a "CR" or "DR" marker if there is one. Otherwise it
// comes from whether the running balance went up or down.

import { normalizeDate, parseAmount } from '../utils.js';

const MONEY_TOKEN = /^-?[\d,]+(\.\d+)?$/;
const CR_DR_TOKEN = /^(CR|DR)$/i;
const OPENING_BALANCE = /^opening balance\s*:?\s*([-\d,.]+)/i;

// Returns the same shape the real AI is asked to return.
export function mockExtract(text) {
  let openingBalance = null;
  let previousBalance = null;
  const transactions = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    const openingMatch = line.match(OPENING_BALANCE);
    if (openingMatch) {
      openingBalance = parseAmount(openingMatch[1]);
      previousBalance = openingBalance;
      continue;
    }

    const words = line.split(/\s+/);
    const date = normalizeDate(words[0]);
    if (!date) continue;

    // Take the amounts off the end of the line. Whatever is left is the description.
    const rest = words.slice(1);
    const tail = [];
    while (rest.length > 0 && (MONEY_TOKEN.test(rest.at(-1)) || CR_DR_TOKEN.test(rest.at(-1)))) {
      tail.unshift(rest.pop());
    }

    const amounts = tail.filter((token) => MONEY_TOKEN.test(token)).map(parseAmount);
    if (amounts.length === 0) continue;

    const marker = tail.find((token) => CR_DR_TOKEN.test(token))?.toUpperCase();
    const balance = amounts.length >= 2 ? amounts.at(-1) : null;
    const amount = balance === null ? amounts[0] : amounts.at(-2);

    let direction = 'debit';
    if (marker) {
      direction = marker === 'CR' ? 'credit' : 'debit';
    } else if (balance !== null && previousBalance !== null) {
      direction = balance > previousBalance ? 'credit' : 'debit';
    }

    transactions.push({
      date,
      description: rest.join(' '),
      debit: direction === 'debit' ? amount : 0,
      credit: direction === 'credit' ? amount : 0,
      balance,
    });

    previousBalance = balance;
  }

  return { opening_balance: openingBalance, transactions };
}
