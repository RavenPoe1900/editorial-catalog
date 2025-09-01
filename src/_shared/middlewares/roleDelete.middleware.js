const UserService = require("../../modules/users/application/user.service");

module.exports = async (req, res, next) => {
  const roleId = req.params.id;
  try {
    const userRes = await UserService.findOneByCriteria({ role: roleId });

    if (userRes && userRes.status === 200 && userRes.data) {
      return res.status(400).json({
        error: "Cannot delete role. Role is assigned to one or more users.",
      });
    }

    next();
  } catch (err) {
    console.error("roleDelete.middleware error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};