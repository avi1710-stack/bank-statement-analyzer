import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBalances, summarize, tagTransaction } from '../src/services/analyze.js';

test('flags only the row whose balance does not add up', () => {
  const rows = [
    { date: '2026-10-01', description: 'SALARY', debit: 0, credit: 100, balance: 1100 },
    { date: '2026-10-02', description: 'RENT', debit: 50, credit: 0, balance: 1000 }, // should be 1050
    { date: '2026-10-03', description: 'FOOD', debit: 25, credit: 0, balance: 975 }, // fine vs shown 1000
  ];

  const checked = checkBalances(rows, 1000);

  assert.equal(checked[0].balanceOk, true);
  assert.equal(checked[1].balanceOk, false);
  assert.equal(checked[1].expectedBalance, 1050);
  assert.equal(checked[1].difference, -50);
  assert.equal(checked[2].balanceOk, true, 'later rows are judged against the shown balance');
});

test('the first row is not checked when there is no opening balance', () => {
  const rows = [
    { date: '2026-10-01', description: 'A', debit: 0, credit: 10, balance: 500 },
    { date: '2026-10-02', description: 'B', debit: 50, credit: 0, balance: 450 },
  ];

  const checked = checkBalances(rows, null);

  assert.equal(checked[0].balanceOk, null);
  assert.equal(checked[1].balanceOk, true);
});

test('a row with no shown balance is not checked', () => {
  const rows = [{ date: '2026-10-01', description: 'A', debit: 0, credit: 10, balance: null }];
  assert.equal(checkBalances(rows, 100)[0].balanceOk, null);
});

test('EMI is only tagged as a whole word', () => {
  assert.deepEqual(tagTransaction({ description: 'PREMIUM LIC POLICY', debit: 4000, credit: 0 }), []);
  assert.deepEqual(tagTransaction({ description: 'EMI HDFC LOAN', debit: 12000, credit: 0 }), ['emi']);
});

test('an RTN row is a bounce and is not counted as an EMI', () => {
  assert.deepEqual(tagTransaction({ description: 'EMI RTN CHARGE', debit: 500, credit: 0 }), ['bounce']);
});

test('salary and cash deposits only count as money in', () => {
  assert.deepEqual(tagTransaction({ description: 'SALARY ACME', debit: 0, credit: 5000 }), ['salary']);
  assert.deepEqual(tagTransaction({ description: 'CASH DEPOSIT', debit: 0, credit: 300 }), ['cash_deposit']);
  assert.deepEqual(tagTransaction({ description: 'SALARY ACME', debit: 5000, credit: 0 }), []);
});

test('summary adds up money in and out exactly, without floating point drift', () => {
  const rows = [
    { debit: 0, credit: 0.1, tags: [], balanceOk: true },
    { debit: 0, credit: 0.2, tags: [], balanceOk: true },
    { debit: 0.3, credit: 0, tags: [], balanceOk: false },
  ];

  const summary = summarize(rows);

  assert.equal(summary.totalIn, 0.3);
  assert.equal(summary.totalOut, 0.3);
  assert.equal(summary.net, 0);
  assert.equal(summary.balanceIssues, 1);
});
