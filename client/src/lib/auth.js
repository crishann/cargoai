import { setAuthToken } from "./api";

const KEY = "cargoai_token";
const USER_KEY = "cargoai_user";

export function saveToken(token) {
  localStorage.setItem(KEY, token);
  setAuthToken(token);
}

export function saveAuthSession({ token, user }) {
  saveToken(token);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getToken() {
  return localStorage.getItem(KEY) || "";
}

export function getAuthUser() {
  const rawUser = localStorage.getItem(USER_KEY);
  if (rawUser) {
    try {
      return JSON.parse(rawUser);
    } catch {
      localStorage.removeItem(USER_KEY);
    }
  }

  const token = getToken();
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));

    return {
      id: decoded.sub,
      username: decoded.username || "",
      role: decoded.role || "",
      email: decoded.email || "",
    };
  } catch {
    return null;
  }
}

export function clearToken() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
  setAuthToken("");
}

export function initAuth() {
  const token = getToken();
  if (token) setAuthToken(token);
}
