const BACKEND_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : window.location.origin;

export const authService = {
  async register({ email, name, password }) {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed.');
    }
    return data;
  },

  async login({ email, password, clientId }) {
    const payload = { email, password };
    if (clientId) {
      payload.client_id = clientId;
    }
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed. Please check your credentials.');
    }
    return data;
  }
};

export const clientService = {
  async register({ appName, redirectUri }) {
    const response = await fetch(`${BACKEND_URL}/api/clients/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_name: appName, redirect_uri: redirectUri }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to register client application.');
    }
    return data;
  }
};

export { BACKEND_URL };
