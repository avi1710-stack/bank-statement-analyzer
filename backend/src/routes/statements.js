// The three API routes:
//   POST /api/statements        submit a statement and analyse it
//   GET  /api/statements        list past statements (summaries)
//   GET  /api/statements/:id    open one statement in full

import { Router } from 'express';
import { createStatement } from '../services/statementService.js';
import { getStatement, listStatements } from '../services/store.js';
import { HttpError } from '../utils.js';

const router = Router();

router.post('/', async (req, res) => {
  const statement = await createStatement({
    text: req.body?.text,
    name: req.body?.name,
  });
  res.status(201).json(statement);
});

router.get('/', async (req, res) => {
  res.json(await listStatements());
});

router.get('/:id', async (req, res) => {
  const statement = await getStatement(req.params.id);
  if (!statement) {
    throw new HttpError(404, 'Statement not found.');
  }
  res.json(statement);
});

export default router;
