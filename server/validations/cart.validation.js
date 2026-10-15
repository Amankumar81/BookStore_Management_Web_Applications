const Joi = require("joi");

const cartSchema = Joi.object({
  bookId: Joi.string().hex().length(24).required(),

  quantity: Joi.number()
    .integer()
    .min(1)
    .required(),
});

module.exports = {
  cartSchema,
};