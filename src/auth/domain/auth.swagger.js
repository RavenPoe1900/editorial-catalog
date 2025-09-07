/**
 * @fileoverview Swagger (OpenAPI) annotations for Auth endpoints.
 *
 * Scope:
 *  - /auth/register
 *  - /auth/login
 *  - /auth/refresh
 *  - /auth/me
 *
 * Notes:
 *  - These routes handle token lifecycle (access + refresh).
 *  - Access token is Bearer JWT; refresh token currently expected in body (can be moved to cookie).
 *
 * Security Guidance:
 *  - If you later move refresh token to HttpOnly cookie, update docs accordingly.
 *  - Avoid exposing full JWT in logs; examples shown here are safe placeholders.
 *
 * Future:
 *  - Add /auth/logout (refresh token revocation) specification.
 *  - Add /auth/rotate-password if implementing forced password cycles.
 */
/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Autenticación y gestión de tokens
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     AuthRegister:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: john.doe@example.com
 *         password:
 *           type: string
 *           example: strongPassword123
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 *
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegister'
 *     responses:
 *       '201':
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '400':
 *         description: Bad request (e.g., missing required fields)
 *       '500':
 *         description: Internal server error
 *
 * /auth/login:
 *   post:
 *     summary: Login an existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegister'
 *     responses:
 *       '200':
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '400':
 *         description: Bad request or invalid credentials
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 *
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token issued at login/refresh
 *     responses:
 *       '200':
 *         description: New tokens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '400':
 *         description: Missing token
 *       '401':
 *         description: Invalid or expired refresh token
 *       '500':
 *         description: Internal server error
 *
 * /auth/me:
 *   get:
 *     summary: Get authenticated user details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 email: { type: string }
 *                 name: { type: string }
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */