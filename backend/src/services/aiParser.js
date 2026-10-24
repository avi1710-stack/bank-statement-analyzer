// Uses an AI model to read statements we have no parser for (for example, bank_e.txt).
// The AI only extracts rows. Totals and balance checks are done by our own code.
//
// Flow: ask the AI -> read its JSON -> check the shape -> if it is broken, ask once more.

import { HttpError, normalizeDate } from '../utils.js';
import { mockExtract } from './mockAi.js';

const MAX_ATTEMPTS = 2;

const INSTRUCTIONS = `You extract transactions from a bank statement.
Reply with ONLY a JSON object. No explanation, no Markdown, no code fences. Use exactly this shape:
{
  "opening_balance": number or null,
  "transactions": [
    { "date": "YYYY-MM-DD", "description": "text", "debit": number, "credit": number, "balance": number or null }
  ]
}
Rules:
- "debit" is money going OUT of the account. "credit" is money coming IN. Use 0 for an empty column.
- Write numbers as plain numbers: no commas and no currency symbols.
- "balance" is the running balance shown on that row, or null if the row shows none.
- Copy every transaction, in the same order. Do not add up totals and do not correct balances.`;

// Returns { source, data } where data is { openingBalance, transactions }.
export async function extractWithAi(text) {
  if (process.env.MOCK_LLM === 'true') {
    try {
      return { source: 'mock_ai', data: validateAiOutput(mockExtract(text)) };
    } catch {
      throw new HttpError(
        422,
        'The built-in reader could not find any transactions in this text. It only understands lines such as "2026-10-01 DESCRIPTION 450.00 12,300.00". For other layouts, add an AI key and set MOCK_LLM=false in backend/.env.'
      );
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new HttpError(
      503,
      'This is not a Bank A statement, so it needs the AI. Add ANTHROPIC_API_KEY to backend/.env, or set MOCK_LLM=true.'
    );
  }

  let problem = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const instructions =
      attempt === 1
        ? INSTRUCTIONS
        : `${INSTRUCTIONS}\n\nYour previous reply was rejected because: ${problem}. Fix that and reply with only the JSON.`;

    const reply = await callAnthropic(apiKey, instructions, text);

    try {
      return { source: 'ai', data: validateAiOutput(parseJsonReply(reply)) };
    } catch (err) {
      problem = err.message;
    }
  }

  throw new HttpError(
    502,
    `The AI reply could not be read after ${MAX_ATTEMPTS} tries (${problem}). Try again or check the statement text.`
  );
}

async function callAnthropic(apiKey, instructions, statementText) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'claude-haiku-5-5',
      max_tokens: 8000,
      system: instructions,
      messages: [{ role: 'user', content: statementText }],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new HttpError(502, `The AI service returned ${response.status}: ${details.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

// Strips code fences and pulls out the JSON object. Throws if it is not valid JSON.
export function parseJsonReply(reply) {
  const cleaned = reply.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('the reply did not contain a JSON object');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Checks the AI's JSON before we trust it. Throws a readable message if anything is wrong.
export function validateAiOutput(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('the reply is not a JSON object');
  }

  const openingBalance = data.opening_balance ?? null;
  if (openingBalance !== null && !isNumber(openingBalance)) {
    throw new Error('opening_balance must be a number or null');
  }

  if (!Array.isArray(data.transactions) || data.transactions.length === 0) {
    throw new Error('transactions must be a non-empty list');
  }

  const transactions = data.transactions.map((row, index) => {
    const label = `transaction ${index + 1}`;

    const date = normalizeDate(row?.date);
    if (!date) throw new Error(`${label} has an invalid date`);

    if (typeof row.description !== 'string') {
      throw new Error(`${label} has no description`);
    }

    const debit = row.debit ?? 0;
    const credit = row.credit ?? 0;
    if (!isNumber(debit) || debit < 0) throw new Error(`${label} has an invalid debit`);
    if (!isNumber(credit) || credit < 0) throw new Error(`${label} has an invalid credit`);

    const balance = row.balance ?? null;
    if (balance !== null && !isNumber(balance)) throw new Error(`${label} has an invalid balance`);

    return {
      date,
      description: row.description.trim(),
      debit,
      credit,
      balance,
    };
  });

  return { openingBalance, transactions };
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}
