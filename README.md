# Custom OIDC Identity Provider (From Scratch)

A custom, fully compliant OpenID Connect (OIDC) Identity Provider built from scratch using Node.js/Express, PostgreSQL, and a decoupled React (Tailwind CSS v4) frontend. 

This project implements standard OAuth 2.0 and OIDC specifications, featuring asymmetric cryptography (RS256), a redirect-based consent mechanism, and robust protections against session hijacking and code replay attacks.

---

## 🛠️ Key Features

### 🔐 1. Cryptography & Security
* **Asymmetric RS256 Signing**: Tokens are signed using RSA Private Keys and verified by client apps using public keys exposed via JWKS.
* **Dynamic Key Rotation**: Programmatic RSA keypair generation and rotation via `/rotate-keys` API endpoint. Multiple active/retired keys are exposed in JWKS, preventing session breaks during rollover.
* **Stateful Refresh Token Rotation (RTR)**: Tracks refresh token lineages in the database. Protects against token theft/replay attacks using PostgreSQL transaction-level row locking (`FOR UPDATE`).
* **PKCE Support (RFC 7636)**: Implements Proof Key for Code Exchange (`code_challenge` / `code_verifier` S256 verification) to support secure logins for public clients (like SPAs and mobile apps) without client secrets.
* **Credentials Security**: Hashing of user passwords and client secrets via `bcrypt` (10 rounds).
* **Automatic Localhost CORS**: Whitelists dynamically any local development port (`localhost:\d+`) during development while maintaining strict credentials tracking.

### 🌐 2. Decoupled Frontend (React + Tailwind CSS v4)
* **Glassmorphic Login UI**: Beautiful interface with input validations and credentials submission.
* **Autofill Demo Credentials Helper**: Quick demo banner on the login screen to allow one-click login for testers/recruiters without manual copy-pasting.
* **Interactive Consent UI**: Mimics a standard user consent screen layout, displaying exact scopes requested, descriptions, and dynamic client identification.
* **Query Parameter Routing**: Light, dependency-free internal router based on browser location state.

### 📚 3. Standard OIDC Endpoints
* **Discovery Config**: `/.well-known/openid-configuration` returns all standard provider metadata.
* **JWKS Endpoint**: `/jwks.json` and `/.well-known/jwks.json` publish active public keys.
* **Core Flow Endpoints**: `/api/oidc/authorize`, `/api/oidc/token`, `/api/oidc/userinfo`, and `/api/oidc/revoke` (RFC 7009 Token Revocation).

### 🚀 4. Performance & Rate Limiting (Redis-Backed)
* **Persistent Redis Session Store**: Session middleware integrated with Redis via `ioredis` and `connect-redis` for fast, memory-safe persistence across server restarts.
* **API Rate Limiting**: Protects sensitive endpoints (Auth, Login, Token) using `express-rate-limit` with `rate-limit-redis` to prevent brute force credentials stuffing.

### 🖥️ 5. Built-in End-to-End Demo Client App
* **Interactive Demo**: `/demo-client` hosts a self-contained web app to test the login, consent, and token exchanges directly from your browser.
* **Auto-Seeding**: Registers standard test client (`demo-client-id`) and test user credentials (`demo@example.com` / `password123`) on startup.

---

## 🗺️ Flow Architecture

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant Client as Client Application
    participant Server as OIDC Server (Port 3000)
    participant React as React Frontend (Port 5174)
    participant DB as PostgreSQL Database

    Client->>User: Redirect to authorize endpoint
    User->>Server: GET /api/oidc/authorize?...
    Server->>Server: Check Session Cookie
    alt User Not Logged In
        Server->>User: Redirect to Login
        User->>React: GET http://localhost:5174/login
        React->>User: Render Sign In Screen
        User->>React: Submit Email/Password
        React->>Server: POST /api/auth/login
        Server->>DB: Verify Credentials
        Server->>React: 200 OK + Set-Cookie (Session)
        React->>User: Redirect back to /api/oidc/authorize
    end

    User->>Server: GET /api/oidc/authorize?... (with Cookie)
    Server->>Server: Check Consent Flag
    alt User Has Not Consented
        Server->>User: Redirect to Consent Screen
        User->>React: GET http://localhost:5174/consent
        React->>User: Render Scope Permissions
        User->>React: Approve Scopes (Click Continue)
        React->>User: Redirect back to /api/oidc/authorize?consented=true
    end

    User->>Server: GET /api/oidc/authorize?...&consented=true
    Server->>DB: Save short-lived authorization code (expires in 2m)
    Server->>User: Redirect to Client App
    User->>Client: GET http://localhost:4000/callback?code=CODE&state=STATE

    Note over Client, Server: Server-to-Server Token Exchange
    Client->>Server: POST /api/oidc/token (code, client_secret)
    Server->>DB: Atomic update `is_used = true` where `code` is unused
    DB-->>Server: Return updated code record
    Server->>Server: Sign Access, Refresh, and ID Tokens (RS256 Private Key)
    Server->>Client: Return Tokens JSON

    Note over Client, Server: Retrieve User Profile
    Client->>Server: GET /api/oidc/userinfo (Header: Bearer AccessToken)
    Server->>Server: Verify token signature (Public Key)
    Server->>Client: Return User Profile claims (sub, name, email)
```

---

## 📂 Project Directory Structure

```text
oidc-provider/
├── common/                     # Shared wrappers
│   ├── dto/
│   │   └── base.dto.ts         # Base Joi schema wrapper
│   ├── middleware/
│   │   ├── validate.middleware.ts # Request schema validator
│   │   └── rateLimitter.middleware.ts # Redis-backed rate limiter
│   ├── ApiError.ts             # Standard Express error wrapper
│   └── ApiResponse.ts          # Standard API response wrapper
├── db/
│   └── migrations/
│       ├── 001_create_users.sql
│       ├── 002_create_clients.sql
│       ├── 003_create_authorization_codes.sql
│       ├── 004_create_signing_keys.sql
│       └── 005_create_refresh_token.sql
├── frontend/                   # Decoupled React Client App
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx       # Custom Login screen
│   │   │   └── Consent.jsx     # Google-like Consent screen
│   │   ├── App.jsx             # Frontend path router
│   │   └── index.css           # Tailwind CSS v4 configuration
│   ├── vite.config.js          # Vite config with @tailwindcss/vite
│   └── package.json
├── src/                        # Express Backend OIDC Provider (TypeScript)
│   ├── controller/
│   │   ├── auth.controller.ts  # Auth route handler (Register/Login)
│   │   ├── clients.controller.ts # Client registration handler
│   │   └── oidc.controller.ts  # Core OIDC protocol handlers
│   ├── dto/
│   │   └── dto.auth.ts         # Input validation schemas
│   ├── model/
│   │   ├── db.ts               # PostgreSQL connection pool (with auto-seeding)
│   │   └── redis.ts            # Redis/ioredis connection pool
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── clients.ts
│   │   ├── demoClient.ts       # Demo Client Router (/demo-client)
│   │   ├── discovery.ts        # Discovery & JWKS routes
│   │   └── oidc.ts
│   ├── service/
│   │   ├── auth.service.ts     # User registration/login logic
│   │   ├── client.service.ts   # Client credential registration
│   │   └── oidc.service.ts     # OIDC Core endpoint logic
│   ├── utils/
│   │   ├── keys.ts             # RSA public/private key generator
│   │   ├── oidc.utils.ts       # Reusable OIDC validation utilities
│   │   └── utils.jwt.ts        # Token signing & verification
│   ├── app.ts                  # App middlewares and routes mounting
│   └── type.d.ts               # Custom express-session type augmentations
├── .env                        # Server configurations
├── docker-compose.yml          # Postgres and Redis container definitions
├── index.ts                    # Backend entrypoint
├── package.json
└── tsconfig.json               # TypeScript configuration
```

---

## ⚙️ Setup & Installation

### 1. Configure local variables
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
JWT_REFRESH_SECRET=your_super_refresh_secret
JWT_SECRET=your_super_jwt_secret

PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...[Your generated pkcs8 PEM RSA private key here]...
-----END PRIVATE KEY-----"
```

### 2. Launch Docker Services (PostgreSQL & Redis)
Spin up the database and caching containers in Docker:
```bash
docker compose up -d
```

### 3. Initialize Database Migrations
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

In a separate terminal tab, move into `frontend/` and launch the React app:
```bash
cd frontend
pnpm install
pnpm run dev
```
The React frontend will start on `http://localhost:5174/` (or `5173`).

---

## 🔌 How to Configure & Integrate OIDC in Your Project

To integrate your client application with this custom OIDC Identity Provider, follow the steps below. We also provide a complete, standalone reference Todo application (originally under `/todo`, now separated into its own local folder) that implements this exact flow.

### 1. Register Your Client Application
Before initiating the flow, you must register your application with the OIDC provider to obtain a `client_id` and `client_secret`.

* **Endpoint**: `POST http://localhost:3000/api/clients/register`
* **Headers**: `Content-Type: application/json`
* **Body**:
  ```json
  {
    "app_name": "My Custom App",
    "redirect_uri": "http://localhost:4000/api/auth/callback"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "statusCode": 201,
    "data": {
      "client_id": "YOUR_ASSIGNED_CLIENT_ID",
      "client_secret": "YOUR_ASSIGNED_CLIENT_SECRET"
    }
  }
  ```

### 2. Configure Client Environment Variables
Store the credentials and provider endpoints in your client project's `.env` configuration file:

```ini
PORT=4000
OIDC_PROVIDER_URL=http://localhost:3000
CLIENT_ID=YOUR_ASSIGNED_CLIENT_ID
CLIENT_SECRET=YOUR_ASSIGNED_CLIENT_SECRET
REDIRECT_URI=http://localhost:4000/api/auth/callback
```

### 3. Redirect Users for Authentication
When a user clicks "Login", redirect their browser to the OIDC provider's authorize endpoint:

```text
http://localhost:3000/api/oidc/authorize?client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>&response_type=code&scope=openid+profile+email&state=<CSRF_STATE>
```

* **Query Parameters**:
  - `client_id`: The ID generated during client registration.
  - `redirect_uri`: Must match the exact redirect URI registered.
  - `response_type`: Must be `code`.
  - `scope`: Standard OIDC scopes requested (e.g., `openid profile email`).
  - `state`: A random, cryptographically secure state parameter to prevent CSRF attacks.

### 4. Exchange Authorization Code for Tokens
Once the user logs in and consents, the OIDC provider will redirect the user back to your `REDIRECT_URI` with a `code` and `state` query parameter:

```text
GET http://localhost:4000/api/auth/callback?code=AUTHORIZATION_CODE&state=CSRF_STATE
```

Verify that the `state` matches your session state, then make a server-to-server POST request to exchange the code for JSON Web Tokens:

* **Endpoint**: `POST http://localhost:3000/api/oidc/token`
* **Headers**: `Content-Type: application/json`
* **Body**:
  ```json
  {
    "grant_type": "authorization_code",
    "code": "AUTHORIZATION_CODE",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uri": "YOUR_REDIRECT_URI"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJSUzI1Ni...",
    "id_token": "eyJhbGciOiJSUzI1Ni...",
    "refresh_token": "eyJhbGciOiJSUzI1Ni...",
    "token_type": "Bearer",
    "expires_in": 900
  }
  ```

### 5. Fetch User Profile Claims
Query the OIDC provider's `/userinfo` endpoint using the `access_token` in the HTTP Authorization header:

* **Endpoint**: `GET http://localhost:3000/api/oidc/userinfo`
* **Headers**: `Authorization: Bearer <access_token>`
* **Response (200 OK)**:
  ```json
  {
    "sub": "user-uuid",
    "name": "Jane Doe",
    "email": "jane.doe@example.com"
  }
  ```

### 6. Local Session & Identity Binding
Using the UserInfo response:
1. Create a local authenticated session for the user in your client application.
2. Bind the user to your database using the **`sub` (Subject)** claim. The `sub` parameter is the OIDC standard unique, immutable identifier for the user.

---

## 📝 Todo Application Reference
For a complete integration example, inspect the standalone Todo App code (originally inside the repository):
- **Backend (Express)**: Shows authorization redirects, code-to-token exchanges, and `/userinfo` data fetching.
- **Frontend (React)**: Demonstrates custom login trigger and auth state checks.

---

## 🧠 Core Concepts & Design Decisions (Q&A Learnings)

Here is a summary of the core architectural concepts, security boundaries, and design decisions validated during the development of this provider:

### 1. Why does the Backend need a `FRONTEND_URL`?
Although the OIDC protocol runs on the backend, the `/api/oidc/authorize` flow is **interactive**—it requires user interaction for authentication and consent. 
* To separate user interface (UI) code from the business logic, the Express backend serves as the orchestrator. 
* If a session is missing or consent is required, the backend issues a `302 Redirect` to the React frontend pages (`/login` and `/consent`). The `FRONTEND_URL` config tells the backend where those React routes reside.

### 2. Token Lifecycles: Access vs. Refresh Tokens
* **Access Tokens (Short-lived, e.g., 15 mins)**: Sent in the `Authorization: Bearer <token>` header of every API call. Keeping their lifespan short minimizes risk if a token is intercepted.
* **Refresh Tokens (Long-lived, e.g., 7 days)**: Acts as the master key to get new access tokens. The client keeps it hidden and sends it to `/api/oidc/token` under `grant_type=refresh_token` when the access token is about to expire.

### 3. Basic vs. Bearer Authentication
* **`Basic` Auth**: Used for **Client Authentication** (server-to-server). A client application (e.g., Zomato Backend) authenticates itself to the OIDC server using `client_id` and `client_secret` (base64-encoded). Used at the `/token`, `/introspect`, and `/revoke` endpoints.
* **`Bearer` Auth**: Used for **User Authorization**. A client presents an access token (JWT) to prove a user has authorized it to fetch their data. Used at resource endpoints like `/userinfo`.

### 4. PKCE (Proof Key for Code Exchange) Flow
* PKCE is a security mechanism designed to prevent authorization code interception attacks on public clients (such as Single Page Apps or Mobile Apps) that cannot securely store a `client_secret`.
* By exchanging a hashed `code_challenge` at the authorization step and validating it with the raw `code_verifier` at the token exchange step, we prove client identity dynamically without exposing hardcoded secrets in front-end bundles.

### 4. Client-Side Clock Checks vs. Server-Side Gatekeeping
* **Client-side checks** (e.g., checking token expiry in memory before making a request) are for **User Experience (UX)**. They prevent requests from failing mid-way by pre-emptively refreshing tokens.
* **Server-side checks** (cryptographically verifying the signature and expiration) are for **Security**. The server must never trust the client's clock or claims, as clients are easily tampered with or bypassed entirely.

### 5. Offline JWKS Verification vs. Online Database Verification
* **Offline Verification**: Client applications use the public keys exposed via `/jwks.json` to verify JWT signatures locally. This requires **zero network requests** to the OIDC provider and zero DB reads, making API calls extremely fast.
* **Online/Database Verification**: The OIDC provider queries the database during `/introspect` and `/userinfo` to check for **real-time account status** (e.g., if a user has been deleted/banned, their token must be invalidated immediately before its natural expiry) and to fetch the most up-to-date user profile properties.

### 6. Audience Verification (`aud` Check)
In both `/introspect` and `/token` (for refresh grant) endpoints, we verify:
```javascript
if (decoded.aud !== client.client_id) { ... }
```
This ensures that Client A cannot introspect, read, or refresh tokens that belong to Client B. This prevents cross-client token leakage from becoming a security loophole.

### 7. Redis-Backed API Rate Limiting & Trust Proxy
- **Brute Force & DDoS Mitigation**: Sensitive routes like `/api/auth/login` and `/api/oidc/token` are protected using IP-based limits stored in Redis.
- **Why Redis for Rate Limiting?** Standard in-memory stores reset on every hot-reload or server restart, resetting the limit count. Redis ensures rate limits are persistently tracked and shared across multiple server instances.
- **The Proxy Challenge**: When running behind a reverse proxy (like Nginx, AWS ALB, or Cloudflare), the server sees the proxy's internal IP. To avoid blocking all public traffic when a single user hits the rate limit, `app.set('trust proxy', 1)` must be configured in Express so it parses the true client IP from the `X-Forwarded-For` header.
