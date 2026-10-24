import { useEffect, useState } from 'react';
import { createStatement, getStatement, listStatements } from './api.js';
import StatementForm from './components/StatementForm.jsx';
import StatementList from './components/StatementList.jsx';
import SummaryCard from './components/SummaryCard.jsx';
import TransactionTable from './components/TransactionTable.jsx';
import { sourceLabel } from './format.js';

export default function App() {
  const [statements, setStatements] = useState([]);
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listStatements()
      .then(setStatements)
      .catch((err) => setError(err.message));
  }, []);

  async function refreshList() {
    setStatements(await listStatements());
  }

  async function handleAnalyse(text, name) {
    setBusy(true);
    setError('');
    try {
      const statement = await createStatement(text, name);
      setCurrent(statement);
      await refreshList();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen(id) {
    setError('');
    try {
      setCurrent(await getStatement(id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="site-header">
        <h1>Bank Statement Analyzer</h1>
        <p>Paste a statement. The app totals the money in and out, and checks that every balance adds up.</p>
      </header>

      <div className="layout">
        <main>
          <StatementForm busy={busy} onAnalyse={handleAnalyse} />

          {error && <p className="error" role="alert">{error}</p>}

          {current && (
            <section className="result">
              <div className="result-heading">
                <h2>{current.name}</h2>
                <p className="muted">Read by {sourceLabel(current.source)}</p>
              </div>
              <SummaryCard summary={current.summary} />
              <TransactionTable transactions={current.transactions} />
            </section>
          )}
        </main>

        <aside>
          <h2>Past statements</h2>
          <StatementList
            statements={statements}
            activeId={current?.id}
            onOpen={handleOpen}
          />
        </aside>
      </div>
    </div>
  );
}
