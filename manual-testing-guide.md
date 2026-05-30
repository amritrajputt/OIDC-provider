# OIDC Provider — Manual Testing Guide

This guide describes how to manually test the OpenID Connect (OIDC) Provider end-to-end using standard HTTP requests (e.g., via `curl` or Postman).

---

## Prerequisites
1. Ensure your PostgreSQL database is running.
2. Start the OIDC server:
   ```bash
   pnpm run dev
   ```
   The server will run on `http://localhost:3000`.

---

## OIDC Test Flow Steps

### Step 1 — Register a Client Application
Register a client application that wants to use your OIDC provider for authentication.

* **URL**: `http://localhost:3000/api/clients/register`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Request Body (Dummy Data)**:
  ```json
  {
    "app_name": "MySampleClientApp",
    "redirect_uri": "http://localhost:4000/callback"
  }
  ```

* **Curl Command**:
  ```bash
  curl -i -X POST http://localhost:3000/api/clients/register \
    -H "Content-Type: application/json" \
    -d "{\"app_name\": \"MySampleClientApp\", \"redirect_uri\": \"http://localhost:4000/callback\"}"
  ```

* **Expected Response (201 Created)**:
  ```json
  {
    "statusCode": 201,
    "data": {
      "id": "e6a2bb91-c852-4751-bb59-0e4c1510b123",
      "client_id": "8347a39e-f3b1-46f6-a6e1-4e871080b867",
      "client_secret": "e51c934256095d21df0d4d5e5dbab7e738bdde9128861cdfe07bd0b645fa4ed4",
      "app_name": "MySampleClientApp",
      "redirect_uri": "http://localhost:4000/callback",
      "created_at": "2026-05-30T18:50:00.000Z"
    },
    "message": "Client registered successfully"
  }
  ```
  > [!IMPORTANT]
  > Save the returned `client_id` and plain `client_secret`. You will need them in the following steps.

---

### Step 2 — Register a User
Create a dummy user account.

* **URL**: `http://localhost:3000/api/auth/register`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Request Body (Dummy Data)**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "password": "securePassword123"
  }
  ```

* **Curl Command**:
  ```bash
  curl -i -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Jane Doe\", \"email\": \"jane.doe@example.com\", \"password\": \"securePassword123\"}"
  ```

* **Expected Response (201 Created)**:
  ```json
  {
    "statusCode": 201,
    "data": {
      "id": "2b793b81-235b-4052-b5c3-78e8e5336f3d",
      "email": "jane.doe@example.com",
      "name": "Jane Doe",
      "created_at": "2026-05-30T18:51:00.000Z"
    },
    "message": "User registered successfully"
  }
  ```

---

### Step 3 — User Login (Session Binding)
Authenticating the user sets the session cookie, which is required to grant authorization codes.

* **URL**: `http://localhost:3000/api/auth/login`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "email": "jane.doe@example.com",
    "password": "securePassword123"
  }
  ```

* **Curl Command**:
  ```bash
  curl -i -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"jane.doe@example.com\", \"password\": \"securePassword123\"}"
  ```

* **Expected Response (200 OK)**:
  ```http
  HTTP/1.1 200 OK
  Set-Cookie: connect.sid=s%3AejZF9... (session cookie)
  Content-Type: application/json

  {
    "statusCode": 200,
    "data": {
      "id": "2b793b81-235b-4052-b5c3-78e8e5336f3d",
      "email": "jane.doe@example.com",
      "name": "Jane Doe"
    },
    "message": "User logged in successfully"
  }
  ```
  > [!IMPORTANT]
  > Copy the value of the `connect.sid` cookie from the `Set-Cookie` header to use in **Step 4**.

---

### Step 4 — Request Authorization Code
Send the user to the authorize endpoint. Since the user is logged in (session cookie attached), the provider generates an authorization code and redirects back to the client application.

* **URL**: `http://localhost:3000/api/oidc/authorize`
* **Method**: `GET`
* **Query Parameters**:
  - `client_id`: `8347a39e-f3b1-46f6-a6e1-4e871080b867` (from Step 1)
  - `redirect_uri`: `http://localhost:4000/callback` (from Step 1)
  - `response_type`: `code`
  - `scope`: `openid`
  - `state`: `xyzState987`

* **Curl Command** (Replace cookie value with the one from Step 3):
  ```bash
  curl -i -X GET "http://localhost:3000/api/oidc/authorize?client_id=8347a39e-f3b1-46f6-a6e1-4e871080b867&redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fcallback&response_type=code&scope=openid&state=xyzState987" \
    -H "Cookie: connect.sid=s%3AejZF9..."
  ```

* **Expected Response (302 Found)**:
  ```http
  HTTP/1.1 302 Found
  Location: http://localhost:4000/callback?code=CODE_HERE&state=xyzState987
  ```
  > [!IMPORTANT]
  > Extract the value of the `code` parameter from the `Location` redirect URL header (e.g., `code=13f8ea67-b44b-4879-a3fd-3382e4c7a950`).

---

### Step 5 — Exchange Authorization Code for Tokens
Exchange the code for the JWT Access token, ID token, and Refresh token.

* **URL**: `http://localhost:3000/api/oidc/token`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "grant_type": "authorization_code",
    "code": "13f8ea67-b44b-4879-a3fd-3382e4c7a950",
    "client_id": "8347a39e-f3b1-46f6-a6e1-4e871080b867",
    "client_secret": "e51c934256095d21df0d4d5e5dbab7e738bdde9128861cdfe07bd0b645fa4ed4",
    "redirect_uri": "http://localhost:4000/callback"
  }
  ```

* **Curl Command** (Replace values with your generated client details and code):
  ```bash
  curl -i -X POST http://localhost:3000/api/oidc/token \
    -H "Content-Type: application/json" \
    -d "{\"grant_type\": \"authorization_code\", \"code\": \"YOUR_CODE\", \"client_id\": \"YOUR_CLIENT_ID\", \"client_secret\": \"YOUR_CLIENT_SECRET\", \"redirect_uri\": \"http://localhost:4000/callback\"}"
  ```

* **Expected Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJSUzI1Ni...",
    "id_token": "eyJhbGciOiJSUzI1Ni...",
    "refresh_token": "eyJhbGciOiJSUzI1Ni...",
    "token_type": "Bearer",
    "expires_in": 900
  }
  ```

---

### Step 5b — Replay Attack / Reuse Protection (Security Check)
Verify that attempting to exchange the exact same code twice fails.

* **Curl Command**: (Repeat the same command from Step 5)
  ```bash
  curl -i -X POST http://localhost:3000/api/oidc/token \
    -H "Content-Type: application/json" \
    -d "{\"grant_type\": \"authorization_code\", \"code\": \"YOUR_CODE\", \"client_id\": \"YOUR_CLIENT_ID\", \"client_secret\": \"YOUR_CLIENT_SECRET\", \"redirect_uri\": \"http://localhost:4000/callback\"}"
  ```

* **Expected Response (400 Bad Request)**:
  ```json
  {
    "error": "invalid_grant",
    "error_description": "invalid_grant"
  }
  ```

---

### Step 6 — Get User Info Profile
Use the Bearer `access_token` returned in Step 5 to query the user's profile claims.

* **URL**: `http://localhost:3000/api/oidc/userinfo`
* **Method**: `GET`
* **Headers**: `Authorization: Bearer YOUR_ACCESS_TOKEN`

* **Curl Command**:
  ```bash
  curl -i -X GET http://localhost:3000/api/oidc/userinfo \
    -H "Authorization: Bearer eyJhbGciOiJSUzI1Ni..."
  ```

* **Expected Response (200 OK)**:
  ```json
  {
    "sub": "2b793b81-235b-4052-b5c3-78e8e5336f3d",
    "name": "Jane Doe",
    "email": "jane.doe@example.com"
  }
  ```

---

### Step 7 — Configuration & JWKS Discovery
Verify metadata and signature public keys.

#### OIDC Discovery
* **URL**: `http://localhost:3000/.well-known/openid-configuration`
* **Curl Command**:
  ```bash
  curl -i http://localhost:3000/.well-known/openid-configuration
  ```
* **Expected Response**: Standard OIDC discovery details mapping authorization, token, userinfo, and JWKS endpoints.

#### JWKS Public Key
* **URL**: `http://localhost:3000/jwks.json`
* **Curl Command**:
  ```bash
  curl -i http://localhost:3000/jwks.json
  ```
* **Expected Response**: The server's RSA Public Key parameters (`n`, `e`, `alg: RS256`) which clients use to verify signature authenticity.
