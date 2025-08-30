const User = require("../../users/application/user.service");
const userPopulate = require("../../users/domain/user.populate");

module.exports = (allowedRoles) => {
  return async (req, res, next) => {
    const user = await User.findById(req.user, [userPopulate]);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.status !==200 ) {
      return res.status(user.status).json({ error: user.error });
    }
    if (!allowedRoles.includes(user.data.role.name)) {
      return res
        .status(403)
        .json({ error: "Access denied, insufficient permissions" });
    }

    next();
  };
};
