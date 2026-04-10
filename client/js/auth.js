// Auth token management
const TOKEN_KEY = "footprint_token";

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

// Redirect if not logged in (for dashboard)
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "index.html";
  }
}

// Logout function
function logout() {
  removeToken();
  window.location.href = "index.html";
}

// API base URL (adjust if needed)
const API_BASE = "http://localhost:5000/api";

// Generic fetch wrapper with auth
async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["x-auth-token"] = token;
  }
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.msg || "Request failed");
  }
  return response.json();
}
