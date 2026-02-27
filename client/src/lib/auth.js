import { setAuthToken } from "./api";

const KEY = "cargoai_token";

export function saveToken(token) {
  localStorage.setItem(KEY, token);
  setAuthToken(token);
}

export function getToken() {
  return localStorage.getItem(KEY) || "";
}

export function clearToken() {
  localStorage.removeItem(KEY);
  setAuthToken("");
}

export function initAuth() {
  const token = getToken();
  if (token) setAuthToken(token);
}