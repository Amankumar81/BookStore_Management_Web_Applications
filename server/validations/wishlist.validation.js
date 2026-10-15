const Joi = require("joi");

const wishlistSchema = Joi.object({
  bookId: Joi.string()
    .hex()
    .length(24)
    .required(),
});

module.exports = {
  wishlistSchema,
};