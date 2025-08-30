const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../../src/app");
const Role = require("../../../src/roles/domain/role.schema");
const config = require("../../../src/_shared/config/config");
const RoleTypeEnum = require("../../../src/_shared/enum/roles.enum");

describe("RoleController Integration Tests", () => {
  let token; // Variable para almacenar el token de autenticación

  beforeAll(async () => {
    await mongoose.disconnect();
    await mongoose.connect(config.MONGODB.urlIntegration, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true,
      sanitizeFilter: true,
    });

    // Obtener el token de autenticación
    const authResponse = await request(app)
      .post("/auth/register") // Ajusta esta ruta a tu endpoint de login
      .send({
        email: "john.doe@example.com", // Usa un correo electrónico válido
        password: "testpassword",
      }); // Usa credenciales válidas para tu sistema
    token = authResponse.body.token; // Ajusta según la estructura de tu respuesta
    console.log("+++++++++++++++++++++++++++++++++++");
    console.log("Token:", token);
    console.log("config:", config.MONGODB.urlIntegration);
    console.log(authResponse.body);
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase(); // Limpia la base de datos después de las pruebas
    await mongoose.connection.close();
  });

  it("should create a new role", async () => {
    const res = await request(app)
      .post("/roles")
      .set("Authorization", `Bearer ${token}`) // Añadir token de autenticación
      .send({ name: RoleTypeEnum.ADMIN });

    expect(res.statusCode).toEqual(201);
    expect(res.body.data.name).toBe(RoleTypeEnum.ADMIN);
  });

  it("should get all roles", async () => {
    const res = await request(app)
      .get("/roles")
      .set("Authorization", `Bearer ${token}`); // Añadir token de autenticación

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("should get a role by ID", async () => {
    const role = await Role.create({ name: RoleTypeEnum.MANAGER });
    const res = await request(app)
      .get(`/roles/${role._id}`)
      .set("Authorization", `Bearer ${token}`); // Añadir token de autenticación

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.name).toBe(RoleTypeEnum.MANAGER);
  });

  it("should update a role by ID", async () => {
    const role = await Role.create({ name: RoleTypeEnum.MANAGER });
    const res = await request(app)
      .put(`/roles/${role._id}`)
      .set("Authorization", `Bearer ${token}`) // Añadir token de autenticación
      .send({ name: "EMPLOYEE_UPDATED" });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.name).toBe("EMPLOYEE_UPDATED");
  });

  it("should soft delete a role by ID", async () => {
    const role = await Role.create({ name: RoleTypeEnum.MANAGER });
    const res = await request(app)
      .delete(`/roles/soft/${role._id}`)
      .set("Authorization", `Bearer ${token}`); // Añadir token de autenticación

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe("Document soft deleted");
  });

  it("should delete a role by ID", async () => {
    const role = await Role.create({ name: RoleTypeEnum.MANAGER });
    const res = await request(app)
      .delete(`/roles/${role._id}`)
      .set("Authorization", `Bearer ${token}`); // Añadir token de autenticación

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe("Document deleted");
  });
});
