// Tests the real AI path without calling the real API: fetch is replaced with canned replies.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { extractWithAi } from '../src/services/aiParser.js';

const GOOD_REPLY = JSON.stringify({
  opening_balance: 100,
  transactions: [{ date: '2026-10-01', description: 'X', debit: 0, credit: 5, balance: 105 }],
});

let originalFetch;
let originalMock;
let originalKey;
let callCount;

function fakeAnthropic(replies) {
  callCount = 0;
  globalThis.fetch = async () => {
    const text = replies[Math.min(callCount, replies.length - 1)];
    callCount += 1;
    return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalMock = process.env.MOCK_LLM;
  originalKey = process.env.ANTHROPIC_API_KEY;
  process.env.MOCK_LLM = 'false';
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  restore('MOCK_LLM', originalMock);
  restore('ANTHROPIC_API_KEY', originalKey);
});

function restore(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test('retries once when the first AI reply is broken', async () => {
  fakeAnthropic(['sorry, here is your data: not json', GOOD_REPLY]);

  const result = await extractWithAi('some statement text');

  assert.equal(result.source, 'ai');
  assert.equal(result.data.transactions.length, 1);
  assert.equal(callCount, 2);
});

test('gives up with a clear error after two broken replies', async () => {
  fakeAnthropic(['not json', '{"transactions": []}']);

  await assert.rejects(extractWithAi('some statement text'), (err) => {
    assert.equal(err.status, 502);
    assert.match(err.message, /could not be read after 2 tries/);
    return true;
  });
  assert.equal(callCount, 2);
});

test('asks for a key clearly when AI is needed but not configured', async () => {
  process.env.ANTHROPIC_API_KEY = '';

  await assert.rejects(extractWithAi('some statement text'), (err) => {
    assert.equal(err.status, 503);
    assert.match(err.message, /ANTHROPIC_API_KEY/);
    return true;
  });
});
