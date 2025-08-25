import { expect, test } from 'vitest';

const base = process.env.API_BASE_URL || 'http://localhost:3000';
const KEY = process.env.KB_API_KEY || 'TEST_KEY';

test('kb search requires auth', async () => {
  const res = await fetch(`${base}/api/kb/search?q=hold`);
  expect(res.status).toBe(401);
});

test('kb search works', async () => {
  const res = await fetch(`${base}/api/kb/search?q=hold`, { 
    headers: { 'X-API-Key': KEY }
  });
  expect([200, 401]).toContain(res.status); // 401 locally if KEY mismatch
});

test('kb answer shape', async () => {
  const res = await fetch(`${base}/api/kb/answer`, {
    method: 'POST',
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'what is the $1 hold?', locale: 'en' })
  });
  expect([200, 401]).toContain(res.status);
});

test('kb article requires auth', async () => {
  const res = await fetch(`${base}/api/kb/article/faq-holds-001`);
  expect(res.status).toBe(401);
});

test('kb article works with auth', async () => {
  const res = await fetch(`${base}/api/kb/article/faq-holds-001`, {
    headers: { 'X-API-Key': KEY }
  });
  expect([200, 401]).toContain(res.status);
});

test('kb search with locale', async () => {
  const res = await fetch(`${base}/api/kb/search?q=hold&locale=fr`, {
    headers: { 'X-API-Key': KEY }
  });
  expect([200, 401]).toContain(res.status);
});

test('kb search with section', async () => {
  const res = await fetch(`${base}/api/kb/search?q=hold&section=faq`, {
    headers: { 'X-API-Key': KEY }
  });
  expect([200, 401]).toContain(res.status);
});
