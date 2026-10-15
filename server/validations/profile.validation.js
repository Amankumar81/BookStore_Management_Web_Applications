const Joi = require("joi");

const profileSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(50),

  phone: Joi.string(),

  avatar: Joi.string().uri(),
});

module.exports = {
  profileSchema,
};