// Small helper functions shared across the backend.

// An error that carries an HTTP status code, so routes can send the right response.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Money is handled as whole cents (paise) so that 0.1 + 0.2 never causes a false mismatch.
export function toCents(amount) {
  return Math.round(amount * 100);
}

export function fromCents(cents) {
  return cents / 100;
}

// Turns "1,234.50" into 1234.5. An empty cell counts as 0.
// Throws if the text is not a number.
export function parseAmount(text) {
  const cleaned = String(text ?? '').replace(/,/g, '').trim();
  if (cleaned === '') return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    throw new Error(`"${text}" is not a valid amount`);
  }
  return value;
}

// Turns 2026-10-01, 01-10-2026 or 01/10/2026 into "2026-10-01".
// Returns null if the text is not a real date.
export function normalizeDate(text) {
  const value = String(text ?? '').trim();

  let match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return isRealDate(year, month, day) ? value : null;
  }

  match = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return isRealDate(year, month, day) ? `${year}-${month}-${day}` : null;
  }

  return null;
}

// Rejects dates like 31/02/2026, which JavaScript would otherwise quietly roll over.
function isRealDate(year, month, day) {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}
