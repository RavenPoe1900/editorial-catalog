const RoleService = require("../application/role.service");

exports.createRole = async (req, res) => {
  const result = await RoleService.create(req.body);
  res.status(result.status).json(result);
};

exports.getAllRoles = async (req, res) => {
  const { page, limit, filter } = req.query;
  const result = await RoleService.findAll(page, limit, filter);
  res.status(result.status).json(result);
};

exports.getRoleById = async (req, res) => {
  const result = await RoleService.findById(req.params.id);
  res.status(result.status).json(result);
};

exports.updateRole = async (req, res) => {
  const result = await RoleService.updateById(req.params.id, req.body);
  res.status(result.status).json(result);
};

exports.softDeleteRole = async (req, res) => {
  const result = await RoleService.softDeleteById(req.params.id);
  res.status(result.status).json(result);
};

exports.deleteRole = async (req, res) => {
  const result = await RoleService.deleteById(req.params.id);
  res.status(result.status).json(result);
};
