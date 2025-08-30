const RoleService = require("../../../src/roles/application/role.service");
const roleController = require("../../../src/roles/infrastructure/roles.controller");

jest.mock("../../../src/roles/application/role.service");

describe("RoleController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createRole", () => {
    it("should create a role and return status 201", async () => {
      const mockReq = { body: { name: "ADMIN" } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockResult = { status: 201, data: { _id: "123", name: "ADMIN" } };

      RoleService.create.mockResolvedValue(mockResult);

      await roleController.createRole(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe("getAllRoles", () => {
    it("should return all roles and status 200", async () => {
      const mockReq = { query: { page: 1, limit: 2, filter: {} } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockResult = { status: 200, data: [{ name: "ADMIN" }] };

      RoleService.findAll.mockResolvedValue(mockResult);

      await roleController.getAllRoles(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe("getRoleById", () => {
    it("should return a role by id and status 200", async () => {
      const mockReq = { params: { id: "123" } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockResult = { status: 200, data: { _id: "123", name: "ADMIN" } };

      RoleService.findById.mockResolvedValue(mockResult);

      await roleController.getRoleById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe("updateRole", () => {
    it("should update a role and return status 200", async () => {
      const mockReq = { params: { id: "123" }, body: { name: "MANAGER" } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockResult = { status: 200, data: { _id: "123", name: "MANAGER" } };

      RoleService.updateById.mockResolvedValue(mockResult);

      await roleController.updateRole(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe("softDeleteRole", () => {
    it("should soft delete a role and return status 200", async () => {
      const mockReq = { params: { id: "123" } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockResult = { status: 200, message: "Document soft deleted" };

      RoleService.softDeleteById.mockResolvedValue(mockResult);

      await roleController.softDeleteRole(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe("deleteRole", () => {
    it("should delete a role and return status 200", async () => {
      const mockReq = { params: { id: "123" } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockResult = { status: 200, message: "Document deleted" };

      RoleService.deleteById.mockResolvedValue(mockResult);

      await roleController.deleteRole(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });
});
