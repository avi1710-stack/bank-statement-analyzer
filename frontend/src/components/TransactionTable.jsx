import { formatMoney } from '../format.js';

const TAG_LABELS = {
  salary: 'Salary',
  emi: 'EMI',
  cash_deposit: 'Cash deposit',
  bounce: 'Bounce (RTN)',
};

export default function TransactionTable({ transactions }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th className="num">Debit</th>
            <th className="num">Credit</th>
            <th className="num">Balance</th>
            <th>Tags</th>
            <th>Balance check</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((row, index) => (
            <tr key={index} className={row.balanceOk === false ? 'problem' : undefined}>
              <td className="nowrap">{row.date}</td>
              <td>{row.description}</td>
              <td className="num">{row.debit > 0 ? formatMoney(row.debit) : ''}</td>
              <td className="num">{row.credit > 0 ? formatMoney(row.credit) : ''}</td>
              <td className="num">{formatMoney(row.balance)}</td>
              <td>
                {row.tags.map((tag) => (
                  <span key={tag} className="tag">{TAG_LABELS[tag]}</span>
                ))}
              </td>
              <td>{balanceCheckText(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function balanceCheckText(row) {
  if (row.balanceOk === null) return 'Not checked';
  if (row.balanceOk) return 'OK';
  return `Does not add up. Expected ${formatMoney(row.expectedBalance)}, off by ${formatMoney(Math.abs(row.difference))}`;
}
