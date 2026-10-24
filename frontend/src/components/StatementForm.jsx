import { useState } from 'react';

export default function StatementForm({ busy, onAnalyse }) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');

  // Loads a .txt file straight into the text box, so the user can review it before analysing.
  async function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    setText(await file.text());
    if (!name) setName(file.name);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onAnalyse(text, name);
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Analyse a statement</h2>

      <label className="field">
        <span>Name (optional)</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="For example: October 2026, Bank A"
        />
      </label>

      <label className="field">
        <span>Upload a text file</span>
        <input type="file" accept=".txt,.csv,text/plain" onChange={handleFile} />
      </label>

      <label className="field">
        <span>Or paste the statement text</span>
        <textarea
          rows={12}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste the statement here..."
        />
      </label>

      <button type="submit" disabled={busy || text.trim() === ''}>
        {busy ? 'Analysing...' : 'Analyse'}
      </button>
    </form>
  );
}
