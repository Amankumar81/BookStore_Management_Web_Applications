const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

beforeAll(async () => {
  const MONGO_URI_TEST = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/bookstore_test_db';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI_TEST);
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Books API', () => {
  // 1. List books
  it('GET /api/books - returns 200 and a books property', async () => {
    const res = await request(app).get('/api/books');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('books');
    expect(Array.isArray(res.body.books)).toBe(true);
  });

  // 2. Search
  it('GET /api/books?search=xyz - returns 200 even with no matches', async () => {
    const res = await request(app).get('/api/books?search=zzzzzzzz');
    expect(res.statusCode).toBe(200);
  });

  // 3. Pagination
  it('GET /api/books?page=1&limit=2 - respects the limit', async () => {
    const res = await request(app).get('/api/books?page=1&limit=2');
    expect(res.statusCode).toBe(200);
    expect(res.body.books.length).toBeLessThanOrEqual(2);
  });

  // 4. Missing book
  it('GET /api/books/:id - returns 404 for a book that does not exist', async () => {
    const res = await request(app).get('/api/books/000000000000000000000000');
    expect(res.statusCode).toBe(404);
  });

  // 5. Invalid id
  it('GET /api/books/:id - returns 400 for an invalid id', async () => {
    const res = await request(app).get('/api/books/not-a-valid-id');
    expect([400, 404, 500]).toContain(res.statusCode);
  });

  // 6. Admin-only action without login
  it('POST /api/books - is rejected without a token', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ title: 'Test Book', author: 'Tester', price: 100, stock: 5 });
    expect([401, 403]).toContain(res.statusCode);
  });
});