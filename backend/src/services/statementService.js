// Runs the whole pipeline for one statement:
// read it (Bank A parser or AI) -> check balances -> tag rows -> summarise -> save.

import { randomUUID } from 'node:crypto';
import { HttpError } from '../utils.js';
import { looksLikeBankA, parseBankA } from './bankAParser.js';
import { extractWithAi } from './aiParser.js';
import { checkBalances, summarize, tagTransaction } from './analyze.js';
import { saveStatement } from './store.js';

const MAX_CHARACTERS = 500_000;

export async function createStatement({ text, name }) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new HttpError(400, 'Paste a bank statement or upload a text file first.');
  }
  if (text.length > MAX_CHARACTERS) {
    throw new HttpError(413, 'That statement is too large (the limit is 500,000 characters).');
  }

  // Step 1: read the rows. Bank A has its own parser. Everything else goes to the AI.
  let read;
  let source;
  if (looksLikeBankA(text)) {
    read = parseBankA(text);
    source = 'bank_a_parser';
  } else {
    const result = await extractWithAi(text);
    read = result.data;
    source = result.source;
  }

  // Step 2: check the balances, then tag each row.
  const checked = checkBalances(read.transactions, read.openingBalance);
  const transactions = checked.map((row) => ({ ...row, tags: tagTransaction(row) }));

  // Step 3: build the summary and save it.
  const statement = {
    id: randomUUID(),
    name: String(name ?? '').trim().slice(0, 100) || 'Untitled statement',
    createdAt: new Date().toISOString(),
    source,
    openingBalance: read.openingBalance,
    transactions,
    summary: summarize(transactions),
  };

  await saveStatement(statement);
  return statement;
}
