import { formatMoney } from '../format.js';

export default function SummaryCard({ summary }) {
  const stats = [
    { label: 'Total money in', value: formatMoney(summary.totalIn) },
    { label: 'Total money out', value: formatMoney(summary.totalOut) },
    { label: 'Net change', value: formatMoney(summary.net) },
    { label: 'Salary received', value: formatMoney(summary.salaryReceived) },
    { label: 'EMIs paid', value: formatMoney(summary.emiPaid) },
    { label: 'Cash deposits', value: formatMoney(summary.cashDeposits) },
    { label: 'Bounces (RTN rows)', value: summary.bounces },
    { label: 'Balances that do not add up', value: summary.balanceIssues, warn: summary.balanceIssues > 0 },
  ];

  return (
    <div className="summary-grid">
      {stats.map((stat) => (
        <div className={`stat${stat.warn ? ' stat-warn' : ''}`} key={stat.label}>
          <span className="stat-label">{stat.label}</span>
          <span className="stat-value">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
