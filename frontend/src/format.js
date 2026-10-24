// Shows 1234.5 as "1,234.50". Missing values show a dash.
export function formatMoney(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Turns the source code saved with each statement into words for the screen.
export function sourceLabel(source) {
  const labels = {
    bank_a_parser: 'the Bank A parser',
    ai: 'AI',
    mock_ai: 'the built-in reader (no AI key)',
  };
  return labels[source] ?? source;
}
