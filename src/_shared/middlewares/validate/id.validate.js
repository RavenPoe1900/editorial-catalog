const Joi = require("joi");

const idSchema = Joi.string().length(24).hex().required();

function validateId(req, res, next) {
  const { error } = idSchema.validate(req.params.id);
  if (error) {
    return res
      .status(400)
      .json({ errors: error.details.map((err) => err.message) });
  }
  next();
}

module.exports = validateId;
