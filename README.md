# AuthCraft :- OIDC Identity Provider

A custom, spec-compliant OpenID Connect (OIDC) Identity Provider built from scratch. It features dynamic key rotation, refresh token rotation (RTR) with thread-safe row locking, PKCE verification for public clients, and persistent Redis caching and session stores.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express (TypeScript)
- **Database**: PostgreSQL (pg pool, auto-seeding)
- **Cache & Sessions**: Redis (`ioredis` + `connect-redis`)
- **Security & Crypto**: Asymmetric cryptography (RS256 signing via dynamic RSA keys), `bcrypt` password hashing, `express-rate-limit`
- **Frontend**: React (Tailwind CSS v4, decoupled login & consent UI)

---

## 🔑 Key Features

### 🔐 1. Cryptography & Key Management
- **Asymmetric RS256 Signing**: Tokens are signed using dynamic RSA Private Keys and verified by client apps using the server's public key exposed via JWKS.
- **Dynamic Key Rotation**: Programmatic RSA keypair generation and rotation via `/rotate-keys` API. Multiple active/retired keys are exposed in JWKS, preventing session breaks during rollover.

### 🛡️ 2. Advanced Protocol Security
- **Stateful Refresh Token Rotation (RTR)**: Tracks refresh token lineages in the database. Protects against token theft/replay attacks using PostgreSQL transaction-level row locking (`FOR UPDATE`).
- **PKCE Support (RFC 7636)**: Implements Proof Key for Code Exchange (`code_challenge` / `code_verifier` S256 verification) supporting secure login for public clients (SPAs/Mobile Apps) without secrets.
- **Atomic Replay Protection**: Single-transaction authorization code consumption prevents race conditions during token exchanges.

### ⚡ 3. Performance & Rate Limiting
- **Persistent Redis Session Store**: Session middleware integrated with Redis via `ioredis` and `connect-redis` for fast, memory-safe persistence across restarts.
- **API Rate Limiting**: Protects sensitive endpoints (Auth, Login, Token) using `express-rate-limit` with `rate-limit-redis` to prevent brute force credentials stuffing.

---

## 🔌 Standard OIDC Endpoints

- **OIDC Configuration (Discovery)**: `GET /.well-known/openid-configuration`
- **JWKS Endpoint**: `GET /jwks.json`
- **Authorization Endpoint**: `GET /api/oidc/authorize`
- **Token Endpoint**: `POST /api/oidc/token`
- **UserInfo Endpoint**: `GET /api/oidc/userinfo`
- **Token Revocation (RFC 7009)**: `POST /api/oidc/revoke`

---

## 🚀 Quick Setup & Installation

### 1. Launch Databases (Docker)
Ensure your docker engine is running, then spin up Postgres and Redis containers:
```bash
docker compose up -d
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```ini
PORT=3000
ISSUER_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5174
REDIS_URL=redis://localhost:6383

DB_HOST=localhost
DB_PORT=5433
DB_USER=oidc_user
DB_PASSWORD=oidc_pass
DB_NAME=oidc_db

SESSION_SECRET=your_super_session_secret
JWT_SECRET=your_super_jwt_secret
JWT_REFRESH_SECRET=your_super_refresh_secret
```

### 3. Run Migrations
Run the SQL migration scripts in sequence to set up tables:
```powershell
# In PowerShell:
Get-Content db/migrations/001_create_users.sql | docker exec -i oidc_postgres psql -U oidc_user -d oidc_db
Get-Content db/migrations/002_create_clients.sql | docker exec -i oidc_postgres psql -U oidc_user -d oidc_db
Get-Content db/migrations/003_create_authorization_codes.sql | docker exec -i oidc_postgres psql -U oidc_user -d oidc_db
Get-Content db/migrations/004_create_signing_keys.sql | docker exec -i oidc_postgres psql -U oidc_user -d oidc_db
Get-Content db/migrations/005_create_refresh_token.sql | docker exec -i oidc_postgres psql -U oidc_user -d oidc_db
```

### 4. Run the Servers
In the root directory, install dependencies and launch the backend:
```bash
pnpm install
pnpm run dev
```

In a separate terminal, move into `frontend/` and launch the React app:
```bash
cd frontend
pnpm install
pnpm run dev
```
