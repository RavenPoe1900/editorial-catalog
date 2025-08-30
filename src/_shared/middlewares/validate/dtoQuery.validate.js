const Joi = require("joi");

function validateQueryDto(schema) {
  return async (req, res, next) => {
    // Validación sincrónica con Joi
    const { error: joiError, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: false,
    }); // `abortEarly: false` para capturar todos los errores

    // Si hay errores de Joi, los acumulamos
    let errors = joiError ? joiError.details.map((err) => err.message) : [];

    // Si hay errores, los retornamos
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    req.query = value;
    // Si no hay errores, continuamos con la solicitud
    next();
  };
}

module.exports = validateQueryDto;
