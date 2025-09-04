const Joi = require("joi");

// Reglas base reutilizables
const emailRule = Joi.string().email().max(254).required();
const passwordRule = Joi.string().min(6).max(128).required();

const loginDto = Joi.object({
  email: emailRule,
  password: passwordRule,
});

const registerDto = Joi.object({
  email: emailRule,
  password: passwordRule,
  name: Joi.string().min(2).max(120).required(),
  // Acepta cualquier string; la validación estricta del nombre de rol se hace en base de datos
  role: Joi.string().min(3).max(50).required(),
});

module.exports = {
  loginDto,
  registerDto,
};