const Joi = require("joi");

const bookSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),

  author: Joi.string().trim().min(2).max(100).required(),

  description: Joi.string().trim().min(10).required(),

  category: Joi.string().required(),

  price: Joi.number().min(1).required(),

  discountPrice: Joi.number().min(0).allow(null),

  stock: Joi.number().integer().min(0).required(),

  isbn: Joi.string().trim().required(),

  publisher: Joi.string().trim().required(),

  language: Joi.string().trim().required(),

  pages: Joi.number().integer().min(1).required(),

  featured: Joi.boolean(),

  bestSeller: Joi.boolean(),
});

module.exports = {
  bookSchema,
};