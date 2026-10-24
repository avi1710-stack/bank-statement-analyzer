// Very simple storage: every statement is kept in one JSON file.
// Good enough for development. A real app would use a database such as SQLite.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.DATA_FILE || path.join(here, '..', '..', 'data', 'statements.json');

async function readAll() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return []; // no file yet means no statements yet
    throw err;
  }
}

async function writeAll(statements) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(statements, null, 2));
}

export async function saveStatement(statement) {
  const all = await readAll();
  all.push(statement);
  await writeAll(all);
}

// Returns summaries only (no transaction rows), newest first.
export async function listStatements() {
  const all = await readAll();
  return all
    .map(({ id, name, createdAt, source, summary }) => ({ id, name, createdAt, source, summary }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getStatement(id) {
  const all = await readAll();
  return all.find((statement) => statement.id === id) ?? null;
}
