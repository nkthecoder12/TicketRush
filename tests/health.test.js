import { test, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

test('GET /health returns 200', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
});