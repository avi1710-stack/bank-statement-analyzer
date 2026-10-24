import 'dotenv/config';
import express from 'express';
import statementRoutes from './routes/statements.js';
import { HttpError } from './utils.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Statements can be long, so allow bigger request bodies than Express's default.
app.use(express.json({ limit: '2mb' }));

app.use('/api/statements', statementRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// One place that turns every error into a JSON response.
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That statement is too large.' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
  if (process.env.MOCK_LLM === 'true') {
    console.log('MOCK_LLM is on: non-Bank-A statements use the built-in reader (no API key needed).');
  } else if (!process.env.ANTHROPIC_API_KEY) {
    console.log('No ANTHROPIC_API_KEY set. Non-Bank-A statements will fail until you add one or set MOCK_LLM=true.');
  }
});
