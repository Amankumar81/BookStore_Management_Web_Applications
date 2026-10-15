const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

beforeAll(async () => {
  const MONGO_URI_TEST =
    process.env.MONGO_URI_TEST ||
    'mongodb://127.0.0.1:27017/bookstore_test_db';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI_TEST);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

const uniqueEmail = `test_${Date.now()}@example.com`;

const validUser = {
  name: 'Test User',
  email: uniqueEmail,
  password: 'Test@1234',
  phone: '9876543210',
};

describe('Auth API', () => {
  // Register

  it('POST /api/auth/register - rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it('POST /api/auth/register - rejects an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...validUser,
        email: 'not-an-email',
      });

    expect(res.statusCode).toBe(400);
  });

  it('POST /api/auth/register - creates a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser);

    console.log('Register response:', res.statusCode, res.body);

    expect([200, 201]).toContain(res.statusCode);
  });

  it('POST /api/auth/register - rejects a duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser);

    expect([400, 409]).toContain(res.statusCode);
  });

  // Login

  it('POST /api/auth/login - rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it('POST /api/auth/login - rejects wrong credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@example.com',
        password: 'WrongPass@123',
      });

    expect([400, 401, 404]).toContain(res.statusCode);
  });
});