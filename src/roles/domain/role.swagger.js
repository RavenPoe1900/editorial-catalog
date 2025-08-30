/**
 * @swagger
 * tags:
 *   - name: Roles
 *     description: Operaciones relacionadas con roles
 *
 * components:
 *   schemas:
 *     RoleCreate:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           enum: [admin, manager, employee]
 *           example: admin
 *
 *     RoleResponse:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleCreate'
 *     responses:
 *       '201': { description: Role created }
 *       '400': { description: Bad request }
 *
 *   get:
 *     summary: Get roles (paginated)
 *     tags: [Roles]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: list of roles
 *
 * /roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200': { description: role found }
 *       '404': { description: not found }
 *
 *   put:
 *     summary: Update role by ID
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, enum: [admin, manager, employee] }
 *     responses:
 *       '200': { description: updated }
 *
 *   delete:
 *     summary: Soft delete role by ID
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200': { description: role soft deleted }
 *
 * /roles/permanent/{id}:
 *   delete:
 *     summary: Permanently delete role by ID
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200': { description: role deleted permanently }
 */