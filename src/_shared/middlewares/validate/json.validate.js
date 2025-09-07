/**
 * @fileoverview Express error middleware for malformed JSON bodies (SyntaxError).
 *
 * Recognition:
 *  - Express.json() will forward a SyntaxError with status=400 when JSON parsing fails.
 *
 * Behavior:
 *  - Responds with 400 and standardized message.
 *  - Delegates to next() otherwise.
 */
module.exports = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON syntax" });
  }
  next();
};