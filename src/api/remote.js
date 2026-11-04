/**
 * HTTP client for the Jogaar server (see server/app.js for the endpoints).
 * Used when REACT_APP_API_URL is set, e.g. "/api" or "http://localhost:4000/api".
 */
import { ApiError } from "./errors";

const API_URL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

async function request(path, { method = "GET", token, body } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (_) {
    throw new ApiError("Can't reach the server. Check your connection and try again.", null, 0);
  }
  let data = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch (_) {}
  }
  if (!res.ok) {
    throw new ApiError(
      (data && data.error) || `Something went wrong (${res.status}).`,
      (data && data.field) || null,
      res.status
    );
  }
  return data;
}

const enc = encodeURIComponent;

export const register = (data) => request("/auth/register", { method: "POST", body: data });
export const login = (data) => request("/auth/login", { method: "POST", body: data });
export const logout = (token) => request("/auth/logout", { method: "POST", token }).catch(() => {});
export const getCurrentUser = (token) => request("/auth/me", { token });
export const updateProfile = (token, data) => request("/auth/me", { method: "PATCH", token, body: data });
export const changePassword = (token, data) => request("/auth/password", { method: "POST", token, body: data });

export const listCampaigns = () => request("/campaigns");
export const getCampaign = (id) =>
  request(`/campaigns/${enc(id)}`).catch((err) => {
    if (err.status === 404) return null;
    throw err;
  });
export const createCampaign = (token, data) => request("/campaigns", { method: "POST", token, body: data });
export const updateCampaign = (token, id, data) =>
  request(`/campaigns/${enc(id)}`, { method: "PATCH", token, body: data });
export const deleteCampaign = (token, id) => request(`/campaigns/${enc(id)}`, { method: "DELETE", token });
export const postUpdate = (token, id, data) =>
  request(`/campaigns/${enc(id)}/updates`, { method: "POST", token, body: data });
export const pledge = (token, id, data) =>
  request(`/campaigns/${enc(id)}/pledges`, { method: "POST", token, body: data });
export const addComment = (token, id, body) =>
  request(`/campaigns/${enc(id)}/comments`, { method: "POST", token, body: { body } });
export const deleteComment = (token, commentId) =>
  request(`/comments/${enc(commentId)}`, { method: "DELETE", token });

export const getSavedIds = (token) => request("/me/saved", { token });
export const toggleSaved = (token, id) => request(`/me/saved/${enc(id)}`, { method: "POST", token });
export const getDashboard = (token) => request("/me/dashboard", { token });

export function resetLocalData() {}
