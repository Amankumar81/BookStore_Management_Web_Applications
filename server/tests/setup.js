jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const mongoose = require('mongoose');

afterAll(async () => {
  await mongoose.connection.close();
});