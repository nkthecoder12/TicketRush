import { test, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { errorMiddleware } from '../middleware/errorMiddleware.js';

test('GET /health returns 200', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
});

test('validation errors use the centralized response format', async () => {
  const res = await request(app).post('/api/signup').send({});

  expect(res.status).toBe(400);
  expect(res.body).toEqual({
    success: false,
    message: 'Name, email, and password are required'
  });
});

test('authentication errors use the centralized response format', async () => {
  const res = await request(app).get('/me');

  expect(res.status).toBe(401);
  expect(res.body).toEqual({
    success: false,
    message: 'Authentication token required'
  });
});

test('invalid error status codes fall back to 500 and preserve the message', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const response = {
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  };

  errorMiddleware(
    { statusCode: Symbol('invalid'), message: 'Unexpected failure' },
    { originalUrl: '/test', method: 'GET' },
    response,
    vi.fn()
  );

  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.json).toHaveBeenCalledWith({
    success: false,
    message: 'Unexpected failure'
  });
  consoleError.mockRestore();
});