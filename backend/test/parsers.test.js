import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { looksLikeBankA, parseBankA } from '../src/services/bankAParser.js';
import { parseJsonReply, validateAiOutput } from '../src/services/aiParser.js';
import { mockExtract } from '../src/services/mockAi.js';
import { checkBalances, summarize, tagTransaction } from '../src/services/analyze.js';
import { normalizeDate, parseAmount } from '../src/utils.js';

const sample = (name) => readFile(new URL(`../../samples/${name}`, import.meta.url), 'utf8');

test('recognises a Bank A statement by its first line', () => {
  assert.equal(looksLikeBankA('BANK A STATEMENT\nDate,Description,Debit,Credit,Balance'), true);
  assert.equal(looksLikeBankA('Bank Alpha Ltd\nstuff'), false);
  assert.equal(looksLikeBankA('Bank E - Account Statement'), false);
});

test('Bank A parser reads rows, quoted commas and the opening balance', () => {
  const text = [
    'BANK A STATEMENT',
    'Opening Balance: 1000.00',
    'Date,Description,Debit,Credit,Balance',
    '01-10-2026,"ELECTRICITY, JULY",200.00,,800.00',
    '02-10-2026,SALARY,,500.00,1300.00',
    'Closing Balance: 1300.00',
  ].join('\n');

  const result = parseBankA(text);

  assert.equal(result.openingBalance, 1000);
  assert.equal(result.transactions.length, 2);
  assert.equal(result.transactions[0].description, 'ELECTRICITY, JULY');
  assert.equal(result.transactions[0].date, '2026-10-01');
  assert.equal(result.transactions[1].credit, 500);
  assert.equal(result.transactions[1].debit, 0);
});

test('Bank A parser explains when the header row is missing', () => {
  assert.throws(() => parseBankA('BANK A STATEMENT\nno table here'), /header row/);
});

test('Bank A sample gives the expected summary', async () => {
  const { openingBalance, transactions } = parseBankA(await sample('bank_a.txt'));
  const checked = checkBalances(transactions, openingBalance).map((row) => ({
    ...row,
    tags: tagTransaction(row),
  }));
  const summary = summarize(checked);

  assert.equal(summary.transactionCount, 10);
  assert.equal(summary.totalIn, 108000);
  assert.equal(summary.totalOut, 37050.5);
  assert.equal(summary.salaryReceived, 85000);
  assert.equal(summary.emiPaid, 24000, 'PREMIUM must not count as an EMI');
  assert.equal(summary.cashDeposits, 20000);
  assert.equal(summary.bounces, 1);
  assert.equal(summary.balanceIssues, 0);
});

test('mock reader finds the hidden balance mistake in the Bank E sample', async () => {
  const { openingBalance, transactions } = validateAiOutput(mockExtract(await sample('bank_e.txt')));
  const checked = checkBalances(transactions, openingBalance);
  const problems = checked.filter((row) => row.balanceOk === false);

  assert.equal(problems.length, 1);
  assert.equal(problems[0].date, '2026-10-08');
  assert.equal(problems[0].expectedBalance, 80500);
});

test('AI reply wrapped in code fences is still read', () => {
  const reply = '```json\n{"opening_balance": null, "transactions": [{"date":"2026-10-01","description":"X","debit":0,"credit":5,"balance":5}]}\n```';
  const data = validateAiOutput(parseJsonReply(reply));
  assert.equal(data.transactions[0].credit, 5);
});

test('AI reply with an impossible date is rejected', () => {
  const bad = { transactions: [{ date: '31/02/2026', description: 'X', debit: 1, credit: 0, balance: null }] };
  assert.throws(() => validateAiOutput(bad), /invalid date/);
});

test('AI reply with a text amount is rejected', () => {
  const bad = { transactions: [{ date: '2026-10-01', description: 'X', debit: '5', credit: 0, balance: null }] };
  assert.throws(() => validateAiOutput(bad), /invalid debit/);
});

test('AI reply that is not JSON is rejected', () => {
  assert.throws(() => parseJsonReply('Sorry, I cannot help with that.'), /JSON object/);
});

test('helpers handle amounts and dates', () => {
  assert.equal(parseAmount('1,234.50'), 1234.5);
  assert.equal(parseAmount(''), 0);
  assert.throws(() => parseAmount('abc'));
  assert.equal(normalizeDate('01/10/2026'), '2026-10-01');
  assert.equal(normalizeDate('2026-10-01'), '2026-10-01');
  assert.equal(normalizeDate('31-02-2026'), null);
});
