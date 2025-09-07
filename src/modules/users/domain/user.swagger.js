/**
 * @fileoverview Swagger specification for User endpoints.
 *
 * Security:
 *  - Typically requires bearerAuth (not explicitly declared here – add global security if mandatory).
 *
 * Pagination:
 *  - Returns 'data' array plus 'pagination' object (custom shape, not standard).
 *
 * Improvement Ideas:
 *  - Replace 'data' with 'items' for consistency with GraphQL or viceversa.
 *  - Add filtering parameters documentation (search, role, email).
 */
/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Operaciones relacionadas con usuarios
 *
 * components:
 *   schemas:
 *     UserCreate:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - role
 *       properties:
 *         name:
 *           type: string
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           example: john.doe@example.com
 *         password:
 *           type: string
 *           example: password123
 *         role:
 *           type: string
 *           example: 60d5f7c2d3e4b4c4f1d0e4e0
 *
 *     UserResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *     responses:
 *       '201':
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       '400':
 *         description: Bad request
 *       '500':
 *         description: Internal server error
 *
 *   get:
 *     summary: Retrieve all users (paginated)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: paginated list of users
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 *
 * /users/{id}:
 *   get:
 *     summary: Retrieve a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: User retrieved
 *       '400':
 *         description: Bad request
 *       '404':
 *         description: Not found
 *
 *   put:
 *     summary: Update a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               role: { type: string }
 *     responses:
 *       '200':
 *         description: Updated user
 *       '400':
 *         description: Bad request
 *       '404':
 *         description: Not found
 *
 *   delete:
 *     summary: Soft delete a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: User soft deleted
 *       '404':
 *         description: Not found
 */