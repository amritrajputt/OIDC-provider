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
* **Autofill Demo Credentials Helper**: Quick demo banner on the login screen to allow one-click login for testers/recruiters without manual copy-pasting.
* **Interactive Consent UI**: Mimics a standard user consent screen layout, displaying exact scopes requested, descriptions, and dynamic client identification.
* **Query Parameter Routing**: Light, dependency-free internal router based on browser location state.

### 📚 3. Standard OIDC Endpoints
* **Discovery Config**: `/.well-known/openid-configuration` returns all standard provider metadata.
* **JWKS Endpoint**: `/jwks.json` and `/.well-known/jwks.json` publish the server's active RSA Public Key.
* **Core Flow Endpoints**: `/api/oidc/authorize`, `/api/oidc/token`, and `/api/oidc/userinfo`.

### 🖥️ 4. Built-in End-to-End Demo Client App
* **Interactive Demo**: `/demo-client` hosts a self-contained web app to test the login, consent, and token exchanges directly from your browser.
* **Auto-Seeding**: Registers standard test client (`demo-client-id`) and test user credentials (`demo@example.com` / `password123`) on startup.

---

## ✅ Implementation Status

### Phase 1: Foundation
* [x] PostgreSQL database setup and migration scripts
* [x] User registration and bcrypt-hashed password authentication
* [x] Client application registration (generating client IDs and secrets)
* [x] Asymmetric RSA key pair generation for RS256 token signing

### Phase 2: OIDC Flow
* [x] `/api/oidc/authorize` route with session and consent checks
* [x] `/api/oidc/token` token exchange endpoint
* [x] ID Token (RS256 JWT) generation with user claims
* [x] `/api/oidc/userinfo` profile query endpoint using access token
* [x] OpenID Discovery (`/.well-known/openid-configuration`) and JWKS (`/jwks.json`) endpoints

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
├── package.json
└── todo/                       # Complete OIDC client implementation (Todo App)
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

## 🔌 How to Configure & Integrate OIDC in Your Project

To integrate your client application with this custom OIDC Identity Provider, follow the steps below. We also provide a complete, standalone reference application inside the [/todo](file:///d:/oidc%20%20provider/todo) folder that implements this exact flow.

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
For a complete integration example, inspect the [/todo](file:///d:/oidc%20%20provider/todo) folder:
- **Backend (Express)**: [/todo/index.js](file:///d:/oidc%20%20provider/todo/index.js) shows authorization redirects, code-to-token exchanges, and `/userinfo` data fetching.
- **Frontend (React)**: [/todo/frontend](file:///d:/oidc%20%20provider/todo/frontend) demonstrates custom login trigger and auth state checks.


