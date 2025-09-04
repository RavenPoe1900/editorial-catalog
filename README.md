# Editorial Catalog — API A (GraphQL) and Search Integrations

A production‑ready technical test implementation for managing an editorial product catalog with:
- API A: GraphQL over Express, backed by MongoDB (primary system of record)
- API B (Search): REST over Express, backed by Elasticsearch (search index)
- Event synchronization via RabbitMQ (publish on changes in API A)

The system models GS1 Product concepts, enforces an editorial workflow by role (provider/editor), keeps an immutable audit trail of changes, and keeps the search index synchronized through a message bus.

This repository is implemented in JavaScript (Node.js/Express) and is designed to run locally with MongoDB, Elasticsearch, and RabbitMQ.

--------------------------------------------------------------------------------

## Key Features

- GraphQL API (API A)
  - Authentication with access/refresh JWTs
  - Role-based authorization via a GraphQL directive (@auth)
  - GS1-like Product model (gtin, name, description, brand, manufacturer, netWeight, weightUnit)
  - Editorial workflow:
    - Provider creates PENDING_REVIEW
    - Editor creates PUBLISHED
    - Editors can approve pending products
  - Full audit trail (CREATE, UPDATE, STATUS_CHANGE) with snapshots of changed business fields
  - Pagination utilities and strict error normalization to GraphQL errors
- Search Integration (API B foundations)
  - Elasticsearch index and mappings for product search (name, brand, description, manufacturer)
  - Upsert index on every product create/update/approve (best-effort)
  - Health and diagnostics routes for ES and RabbitMQ
  - RabbitMQ topic exchange for domain events (product.created, product.updated, product.approved)
- Robust Infrastructure
  - Config driven by environment variables (JWT, MongoDB, ES, RabbitMQ)
  - Startup checks with retry for ES and RabbitMQ
  - Refresh Token cleanup cron job
  - Swagger UI for REST docs (where applicable)
  - Sanitization and validation middlewares for REST surfaces

--------------------------------------------------------------------------------

## Architecture Overview

```
          +--------------------+                  +-----------------------+
          |   API A (GraphQL)  |                  |   API B (Search REST) |
          |  Express + MongoDB |                  |    Express + ES       |
          |                    |                  |  (consumer of events) |
          +-----+--------------+                  +-----------+-----------+
                |                                           ^
                | GraphQL Mutations                         | REST GET /search (name/brand/desc)
                v                                           |
        +-------+--------+                                  |
        |  Product Svc   |                                  |
        |  (business)    |                                  |
        +---+-------+----+                                  |
            |       |                                       |
     Audit  |       |  Publish best-effort events           |
    +-------v--+    +---------------+                       |
    |Product   |                    |                       |
    |Changes   |                    |                       |
    |(Mongo)   |                    |                       |
    +----------+                    v                       |
                         +----------+-----------+           |
                         | RabbitMQ (topic ex.) |-----------+
                         +----------+-----------+
                                    |
                                Consumers (Search)
                                    |
                             +------+------+
                             | Elasticsearch|
                             +-------------+
```

- API A is the system of record; products are stored in MongoDB.
- On create/update/approve, API A:
  - Persists an audit entry (immutable snapshots)
  - Publishes a domain event to RabbitMQ (best-effort)
  - Upserts the product document into Elasticsearch (best-effort)
- API B provides a textual search (name, brand, description). If implemented as a separate service, it should subscribe to events and keep the ES index updated as well.

--------------------------------------------------------------------------------

## Tech Stack

- Node.js, Express
- GraphQL (graphql-http), @graphql-tools/schema and custom @auth directive
- MongoDB (Mongoose)
- Elasticsearch (official JS client)
- RabbitMQ (amqplib)
- Joi for DTO validation
- bcrypt for password hashing
- JSON Web Tokens (jsonwebtoken)
- Swagger UI for REST docs
- Postman collection for GraphQL and diagnostics

--------------------------------------------------------------------------------

## Repository Structure (high-level)

- src/graphql
  - schema, context, scalars, directives (@auth), module loader
  - modules: auth, products, product-changes (SDL + resolvers)
- src/modules
  - products: domain (schema, dto, populate, enums, gtin utils), application (service), graphql (resolvers, typedefs)
  - product-changes: domain (schema), application (service)
  - users, roles: support modules (required for auth and authorization)
- src/_shared
  - config, db (base schema, Mongo connect), jobs (refresh token cleanup), middlewares
  - integrations (elasticsearch, rabbitmq), diagnostics routes
  - utils (logger, errors), swagger setup
- postman collection (treew.json) with GraphQL operations and diagnostics

--------------------------------------------------------------------------------

## Environment Variables

Create a .env file at the project root. Below is a complete reference:

```
# Server
PORT=3015
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/editorial_catalog
# Optional integration/test DB
MONGO_URI_INTEGRATION=

# JWT (access)
JWT_SECRET_KEY=your-access-secret
JWT_SECRET_KEY_EXPIRES=15m

# JWT (refresh)
JWT_REFRESH_KEY=your-refresh-secret
JWT_REFRESH_EXPIRES=7d
REFRESH_MAX_TOKENS=5

# Cookies (if using refresh via cookies)
COOKIE_SECURE=false
COOKIE_SAMESITE=Lax
# COOKIE_MAXAGE=3600000

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_PRODUCT_INDEX=products
STARTUP_RETRIES_SEARCH=10
STARTUP_RETRY_DELAY_MS=2000

# RabbitMQ
RABBITMQ_URL=amqp://localhost
RABBITMQ_EXCHANGE=products.events
STARTUP_RETRIES_RABBIT=10

# Jobs (cron)
CRON_CLEANUP_REFRESH_TOKENS=0 2 * * *   # daily at 02:00
```

Notes:
- JWT_*_EXPIRES accepts jsonwebtoken syntax, e.g. 15m, 12h, 7d.
- For production, always provide real secrets and secure cookie settings.

--------------------------------------------------------------------------------

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- MongoDB (local or container)
- Elasticsearch 8.x (local or container)
- RabbitMQ 3.x (local or container)
- curl/Postman/GraphiQL for testing

### Install

```
npm install
```

### Run (Local)

Ensure MongoDB, Elasticsearch, and RabbitMQ are running, then:

```
# Development (adjust to your package.json scripts)
npm run dev

# or Production-like
npm start
```

- GraphQL endpoint: http://localhost:3015/graphql
- GraphiQL (dev playground): http://localhost:3015/graphiql
- Swagger UI (REST docs where applicable): http://localhost:3015/api-docs
- Diagnostics/Health:
  - GET /health/elasticsearch
  - GET /health/elasticsearch/index
  - GET /health/rabbitmq
  - POST /diagnostics/rabbitmq/publish
  - POST /diagnostics/elasticsearch/upsert

### Optional: Run Dependencies with Docker

Quick start (example):

```
# Elasticsearch (single node dev)
docker run -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" docker.elastic.co/elasticsearch/elasticsearch:8.14.0

# RabbitMQ
docker run -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# MongoDB
docker run -p 27017:27017 mongo:6
```

Configure ELASTICSEARCH_URL, RABBITMQ_URL, MONGO_URI accordingly in .env.

--------------------------------------------------------------------------------

## Authentication and Authorization

- Register/Login/Refresh return:
  ```
  {
    accessToken,
    refreshToken,
    user { id, email, role { id, name } }
  }
  ```
- Access token embeds `{ userId, role }`.
- Use Authorization: Bearer <accessToken> on protected GraphQL operations.
- @auth directive enforces authentication and role checks:
  - e.g. products/products queries require one of [ADMIN, MANAGER, EDITOR, PROVIDER]
  - createProduct/updateProduct require [EDITOR, PROVIDER]
  - approveProduct requires [EDITOR]

### Example GraphQL Operations

Register (Editor):
```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    accessToken
    refreshToken
    user { id email role { id name } }
  }
}
# variables:
# { "input": { "email": "editor@example.com","password": "Passw0rd!","name": "Editor One","role": "editor" } }
```

Login:
```graphql
mutation Login($input: AuthInput!) {
  login(input: $input) {
    accessToken
    refreshToken
    user { id email role { id name } }
  }
}
# variables:
# { "input": { "email": "editor@example.com", "password": "Passw0rd!" } }
```

Me:
```graphql
query {
  me { id email role { id name } }
}
```

--------------------------------------------------------------------------------

## Product Model (GS1‑like)

Fields aligned to GS1 concepts:
- gtin (8/12/13/14 digits, numeric, with correct check digit)
- name, description, brand
- manufacturer { name, code, country }
- netWeight, weightUnit (g, kg, ml, l, oz, lb)
- status (PENDING_REVIEW, PUBLISHED)
- createdBy (User)
- Automatic timestamps, soft-delete support (not exposed via GraphQL)

Strict validation:
- Joi DTOs validate inputs
- Mongoose schema validates format and check digit
- Utility: compute/validate GTIN check digit

--------------------------------------------------------------------------------

## Editorial Workflow

- Provider
  - createProduct -> PENDING_REVIEW
  - can update only own PENDING_REVIEW products; cannot change status
- Editor
  - createProduct -> PUBLISHED
  - approveProduct(id) switches PENDING_REVIEW -> PUBLISHED

Domain events and ES upsert are performed on create, update, and approve.

### Sample GraphQL

Create product as Provider:
```graphql
mutation Create($input: ProductCreateInput!) {
  createProduct(input: $input) { id gtin name status }
}
# input: ensure Authorization header with provider token
```

Approve as Editor:
```graphql
mutation Approve($id: ObjectID!) {
  approveProduct(id: $id) { id status }
}
```

Query product with history:
```graphql
query Product($id: ObjectID!) {
  product(id: $id) {
    id gtin name brand status
    changes { id operation changedAt }
  }
}
```

List products with filters:
```graphql
query Products($page:Int,$limit:Int,$filter:ProductFilterInput){
  products(page:$page,limit:$limit,filter:$filter){
    items{ id name brand status }
    pageInfo{ page limit totalItems totalPages }
  }
}
# Example filter: { "search": "Ju", "status": "PUBLISHED" }
```

--------------------------------------------------------------------------------

## Audit Trail

- ProductChange documents store:
  - productId, changedBy, changedAt
  - operation: CREATE | UPDATE | STATUS_CHANGE
  - previousValues, newValues (JSON strings of business fields)
- GraphQL Product.changes resolves the latest changes first.

--------------------------------------------------------------------------------

## Search (Elasticsearch)

- Index: ELASTICSEARCH_PRODUCT_INDEX (default: products)
- Mappings tuned for:
  - name, brand, manufacturer.name: edge-ngram analyzer for type-ahead
  - description: standard full-text
- On product create/update/approve:
  - Upsert doc into ES (best-effort)
  - Publish event to RabbitMQ (product.*)

Diagnostics:
- GET /health/elasticsearch — ping ES
- GET /health/elasticsearch/index — ensure index exists
- POST /diagnostics/elasticsearch/upsert — upsert an arbitrary product document for testing

Note:
- A dedicated REST Search API (API B) can expose endpoints like GET /search/products?q=... across name/brand/description, consuming events from RabbitMQ if desired. This repo already provides the indexer and the event publication from API A.

--------------------------------------------------------------------------------

## RabbitMQ (Message Bus)

- Topic exchange: RABBITMQ_EXCHANGE (default: products.events)
- Publisher (API A) emits:
  - product.created
  - product.updated
  - product.approved
- Diagnostics:
  - GET /health/rabbitmq — quick connectivity check
  - POST /diagnostics/rabbitmq/publish — manual publish to test exchange

--------------------------------------------------------------------------------

## Postman Collection

- File: treew.json (Auth, Products workflow, Diagnostics)
- What it does:
  - Registers provider/editor
  - Logins and captures access tokens
  - Creates/updates/approves products
  - Queries product with changes
  - Hits diagnostics endpoints
- Tips:
  - Ensure Authorization: Bearer <token> is set for protected operations
  - Role field must be queried with subfields: `role { id name }`

--------------------------------------------------------------------------------

## Jobs

- Refresh token cleanup (cron):
  - Schedules via CRON_CLEANUP_REFRESH_TOKENS (default 02:00 daily)
  - Deletes expired refresh tokens in batches

--------------------------------------------------------------------------------

## Security Notes

- Access/Refresh tokens:
  - Access tokens short‑lived (JWT_SECRET_KEY_EXPIRES)
  - Refresh tokens persisted with JTI, rotated on use, and revocable
- Avoid leaking error details to clients; errors are normalized
- Mongo sanitize middleware included for REST surfaces

--------------------------------------------------------------------------------

## Troubleshooting

- Unauthenticated (GraphQL):
  - Missing Authorization header or expired/invalid token
  - Fix: add header `Authorization: Bearer <accessToken>`
- Field "role" must have selection of subfields:
  - In GraphQL, role is an object — query `role { id name }`
- Elasticsearch ping failed:
  - Check ELASTICSEARCH_URL and that ES is running
- RabbitMQ connection failed:
  - Check RABBITMQ_URL, broker is up, and credentials
- Duplicate Key Error on Product.gtin:
  - gtin is unique; ensure you’re not reusing an existing one
- GTIN invalid:
  - Must be numeric and 8/12/13/14 digits with correct check digit

--------------------------------------------------------------------------------

## Seed and Initializers

- Roles initializer ensures baseline roles: employee, provider, editor
- On startup you can call the initializer (idempotent) to ensure roles exist

--------------------------------------------------------------------------------

## Scripts (examples)

Adjust to your package.json:
- `npm run dev` — start in watch/development mode
- `npm start` — start in production mode

--------------------------------------------------------------------------------

## Deliverables and Compliance (Technical Test)

- API A: GraphQL over Express with MongoDB — Implemented
- API B: Search (REST over Express with Elasticsearch) — foundation provided (indexer, events, diagnostics). A REST search endpoint can be added trivially (e.g., GET /search/products?q=...), or hosted as a separate service that consumes bus events.
- Synchronization: RabbitMQ topic exchange & ES upsert on changes — Implemented
- Roles & Editorial Flow: provider/editor behavior — Implemented
- Audit Trail: persisted change history per product — Implemented
- Non-functional:
  - Express on both APIs
  - MongoDB + Elasticsearch
  - At least one API in JavaScript — Implemented
  - Role-based authorization — Implemented
  - Local run instructions — Included
- AI Usage Report:
  - Provide IA-report.md in the repo (see next section)

--------------------------------------------------------------------------------

## AI Usage Report

The test requires an “IA-report.md” detailing:
- Tools used (assistants, generators)
- Prompts/key interactions
- Decisions made thanks to AI
- Limitations encountered
- Conclusions about usefulness for this kind of project

Place the file at the repo root:
- IA-report.md

--------------------------------------------------------------------------------

## Contributing

- Use Conventional Commits for clarity: `feat:`, `fix:`, `chore:`, `docs:`, etc.
- Open an issue/PR with a clear description and steps to test.

--------------------------------------------------------------------------------

## License

This codebase is provided for technical test and demonstration purposes. If you plan to use it in production, please add an appropriate LICENSE file and ensure compliance with all dependencies.