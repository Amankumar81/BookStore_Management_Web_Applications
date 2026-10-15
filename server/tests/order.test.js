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

describe('Orders API (protected routes)', () => {
  it('GET /api/orders - is rejected without a token', async () => {
    const res = await request(app).get('/api/orders');
    expect([401, 403]).toContain(res.statusCode);
  });

  it('POST /api/orders - is rejected without a token', async () => {
    const res = await request(app).post('/api/orders').send({});
    expect([401, 403]).toContain(res.statusCode);
  });

  it('GET /api/orders - is rejected with an invalid token', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', 'Bearer invalidtoken123');
    expect([401, 403]).toContain(res.statusCode);
  });

  it('GET /api/dashboard - customers/anonymous users cannot access admin data', async () => {
    const res = await request(app).get('/api/dashboard');
    expect([401, 403, 404]).toContain(res.statusCode);
  });
});