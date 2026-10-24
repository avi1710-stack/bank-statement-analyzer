export default function StatementList({ statements, activeId, onOpen }) {
  if (statements.length === 0) {
    return <p className="muted">No statements yet. Analysed statements will appear here.</p>;
  }

  return (
    <ul className="statement-list">
      {statements.map((statement) => (
        <li key={statement.id}>
          <button
            type="button"
            className={statement.id === activeId ? 'active' : undefined}
            onClick={() => onOpen(statement.id)}
          >
            <strong>{statement.name}</strong>
            <span className="muted">
              {new Date(statement.createdAt).toLocaleString()}
            </span>
            <span className="muted">
              {statement.summary.transactionCount} rows
              {statement.summary.balanceIssues > 0 &&
                ` · ${statement.summary.balanceIssues} balance problem${statement.summary.balanceIssues === 1 ? '' : 's'}`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
