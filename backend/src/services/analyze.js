// All the money maths lives here, in plain code.
// The AI only reads rows. It never adds up totals or checks balances.

import { fromCents, toCents } from '../utils.js';

const SALARY_RE = /\bSALARY\b/i;
const CASH_DEPOSIT_RE = /\bCASH\s*DEP(OSIT)?\b/i;
const EMI_RE = /\bEMI\b/i; // \b so that "PREMIUM" does not count as an EMI
const BOUNCE_RE = /\bRTN\b/i;

// Checks each row's balance.
// Rule: previous shown balance + money in - money out should equal this row's shown balance.
// We compare against the previous *shown* balance, so one wrong row only flags that row,
// not every row after it.
export function checkBalances(transactions, openingBalance) {
  let previous = openingBalance ?? null;

  return transactions.map((row) => {
    let expectedBalance = null;
    let difference = null;
    let balanceOk = null; // null means "could not check"

    if (previous !== null && row.balance !== null) {
      const expectedCents = toCents(previous) + toCents(row.credit) - toCents(row.debit);
      const differenceCents = toCents(row.balance) - expectedCents;

      expectedBalance = fromCents(expectedCents);
      difference = fromCents(differenceCents);
      balanceOk = differenceCents === 0;
    }

    previous = row.balance;
    return { ...row, expectedBalance, difference, balanceOk };
  });
}

// Works out which special kinds of transaction a row is.
// A row can have more than one tag, for example a bounced EMI.
export function tagTransaction(row) {
  const tags = [];
  const isBounce = BOUNCE_RE.test(row.description);

  if (isBounce) tags.push('bounce');
  if (row.credit > 0 && SALARY_RE.test(row.description)) tags.push('salary');
  if (row.credit > 0 && CASH_DEPOSIT_RE.test(row.description)) tags.push('cash_deposit');
  if (row.debit > 0 && !isBounce && EMI_RE.test(row.description)) tags.push('emi');

  return tags;
}

// Adds up the summary numbers from the tagged, balance-checked rows.
export function summarize(transactions) {
  let totalIn = 0;
  let totalOut = 0;
  let salary = 0;
  let emi = 0;
  let cash = 0;
  let bounces = 0;
  let balanceIssues = 0;

  for (const row of transactions) {
    const creditCents = toCents(row.credit);
    const debitCents = toCents(row.debit);

    totalIn += creditCents;
    totalOut += debitCents;

    if (row.tags.includes('salary')) salary += creditCents;
    if (row.tags.includes('emi')) emi += debitCents;
    if (row.tags.includes('cash_deposit')) cash += creditCents;
    if (row.tags.includes('bounce')) bounces += 1;
    if (row.balanceOk === false) balanceIssues += 1;
  }

  return {
    transactionCount: transactions.length,
    totalIn: fromCents(totalIn),
    totalOut: fromCents(totalOut),
    net: fromCents(totalIn - totalOut),
    salaryReceived: fromCents(salary),
    emiPaid: fromCents(emi),
    cashDeposits: fromCents(cash),
    bounces,
    balanceIssues,
  };
}
