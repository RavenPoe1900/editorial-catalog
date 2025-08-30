const Joi = require("joi");

function validateBodyDto(schema) {
  return async (req, res, next) => {
    // Validación sincrónica con Joi
    const { error: joiError, value } = await schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
    }); // `abortEarly: false` para capturar todos los errores

    // Si hay errores de Joi, los acumulamos
    let errors = joiError ? joiError.details.map((err) => err.message) : [];

    // Si hay errores, los retornamos
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    req.body = value;
    // Si no hay errores, continuamos con la solicitud
    next();
  };
}

module.exports = validateBodyDto;
