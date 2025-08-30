const mongoSanitize = require("mongo-sanitize");

module.exports = (req, _res, next) => {
  req.body = mongoSanitize(req.body);

  req.query = mongoSanitize(req.query);

  req.params = mongoSanitize(req.params);

  next();
};
