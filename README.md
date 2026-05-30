# Custom OIDC Identity Provider (From Scratch)

A custom, fully compliant OpenID Connect (OIDC) Identity Provider built from scratch using Node.js/Express, PostgreSQL, and a decoupled React (Tailwind CSS v4) frontend. 

This project implements standard OAuth 2.0 and OIDC specifications, featuring asymmetric cryptography (RS256), a redirect-based consent mechanism, and robust protections against session hijacking and code replay attacks.

---

## 🛠️ Key Features

### 🔐 1. Cryptography & Security
* **Asymmetric RS256 Signing**: Tokens are signed using an RSA Private Key and verified by client apps using the server's public key exposed via JWKS.
* **Anti-Replay Protection**: Atomic, single-transaction authorization code consumption prevents race conditions (concurrent replay attacks) during token exchanges.
* **Credentials Security**: Hashing of user passwords and client secrets via `bcrypt` (10 rounds).
* **Automatic Localhost CORS**: Whitelists dynamically any local development port (`localhost:\d+`) during development while maintaining strict credentials tracking.

### 🌐 2. Decoupled Frontend (React + Tailwind CSS v4)
* **Glassmorphic Login UI**: Beautiful interface with input validations and credentials submission.
* **Interactive Consent UI**: Mimics the Google Consent screen layout, displaying exact scopes requested, descriptions, and dynamic client identification.
* **Query Parameter Routing**: Light, dependency-free internal router based on browser location state.

### 📚 3. Standard OIDC Endpoints
* **Discovery Config**: `/.well-known/openid-configuration` returns all standard provider metadata.
* **JWKS Endpoint**: `/jwks.json` and `/.well-known/jwks.json` publish the server's active RSA Public Key.
* **Core Flow Endpoints**: `/api/oidc/authorize`, `/api/oidc/token`, and `/api/oidc/userinfo`.

### 🖥️ 4. Built-in End-to-End Demo Client App
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
│   │   └── base.dto.js         # Base Joi schema wrapper
│   ├── middleware/
│   │   └── validate.middleware.js # Request schema validator
│   ├── ApiError.js             # Standard Express error wrapper
│   └── ApiResponse.js          # Standard API response wrapper
├── db/
│   └── migrations/
│       ├── 001_create_users.sql
│       ├── 002_create_clients.sql
│       └── 003_create_authorization_codes.sql
├── frontend/                   # Decoupled React Client App
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx       # Custom Login screen
│   │   │   └── Consent.jsx     # Google-like Consent screen
│   │   ├── App.jsx             # Frontend path router
│   │   └── index.css           # Tailwind CSS v4 configuration
│   ├── vite.config.js          # Vite config with @tailwindcss/vite
│   └── package.json
├── src/                        # Express Backend OIDC Provider
│   ├── controller/
│   │   ├── auth.js             # Auth route handler (Register/Login)
│   │   ├── clients.js          # Client registration handler
│   │   └── oidc.js             # Core OIDC protocol handlers
│   ├── dto/
│   │   └── dto.auth.js         # Input validation schemas
│   ├── model/
│   │   └── db.js               # PostgreSQL connection pool (with auto-seeding)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── clients.js
│   │   ├── demoClient.js       # Demo Client Router (/demo-client)
│   │   ├── discovery.js        # Discovery & JWKS routes
│   │   └── oidc.js
│   ├── service/
│   │   ├── auth.service.js     # User registration/login logic
│   │   ├── client.service.js   # Client credential registration
│   │   └── oidc.service.js     # OIDC Core endpoint logic
│   ├── utils/
│   │   ├── keys.js             # RSA public/private key generator
│   │   └── utils.jwt.js        # Token signing & verification
│   └── app.js                  # App middlewares and routes mounting
├── .env                        # Server configurations
├── docker-compose.yml          # Postgres database container definition
├── index.js                    # Backend entrypoint
├── manual-testing-guide.md     # Steps for manual curls/Postman testing
├── package.json
└── test-oidc.js                # Complete E2E integration test script
```

---

## ⚙️ Setup & Installation

### 1. Configure local variables
Create a `.env` file in the root directory:
```ini
PORT=3000
ISSUER_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5174

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

### 2. Launch PostgreSQL Container
Spin up the database container in Docker:
```bash
docker-compose up -d postgres
```

### 3. Initialize Database Migrations
Run the SQL migration scripts in sequence to set up tables:
```powershell
# In PowerShell:
Get-Content db/migrations/001_create_users.sql | docker exec -i oidc_postgres psql -U oidc_user -d oidc_db
Get-Content db/migrations/002_create_clients.sql | docker exec -i oidc_postgres psql -U oidc_user -d oidc_db
Get-Content db/migrations/003_create_authorization_codes.sql | docker exec -i oidc_postgres psql -U oidc_user -d oidc_db
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

## 🧪 Testing with the Built-in OIDC Demo Client

The server includes a pre-packaged OIDC Demo Client App to easily test the Identity Provider flow end-to-end.

1. Start both the backend and frontend servers as described above.
2. Open your browser and navigate to **`http://localhost:3000/demo-client`**.
3. Click the **Login using Custom OIDC** button.
4. You will be redirected to the React frontend Sign In page (`http://localhost:5173/login`).
5. Log in with the pre-seeded credentials:
   - **Email**: `demo@example.com`
   - **Password**: `password123`
6. You will then see the Consent Screen requesting the `openid` scope. Click **Continue**.
7. The server will redirect you back to the Demo Client callback page (`http://localhost:3000/demo-client/callback`), showing:
   - **User Profile Information** (retrieved from the `/api/oidc/userinfo` endpoint using the Access Token)
   - **ID Token** (signed RS256 JWT containing user identity claims)
   - **Access Token** (signed bearer token)
   - **Verified OAuth state** parameter

