const Joi = require("joi");
//Se pueden hacer las validaciones internas y externas juntas
function validateExternalDto(schema) {
  return async (req, res, next) => {
    // Validación sincrónica con Joi
    try {
      const { error: joiError, value } = await schema.validateAsync(req.body, {
        abortEarly: false,
        allowUnknown: false,
      }); // `abortEarly: false` para capturar todos los errores

      console.log(joiError);
      // Si hay errores de Joi, los acumulamos
      let errors = joiError ? joiError.details.map((err) => err.message) : [];

      // Si hay errores, los retornamos
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }
      next();
    } catch (error) {
      // Maneja el error si la validación falla
      res.status(400).json({ errors: error.details.map((err) => err.message) });
    }
  };
}

// const validateExternalDto = (schema) => {
//   return async (req, res, next) => {
//     try {
//       await schema.validateAsync(req.body); // Espera a que se complete la validación
//       next(); // Continúa al siguiente middleware si la validación es exitosa
//     } catch (error) {
//       // Maneja el error si la validación falla
//       res.status(400).json({ errors: error.details.map((err) => err.message) });
//     }
//   };
// };

module.exports = validateExternalDto;
