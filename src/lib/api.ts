import { auth } from "../firebase";

async function authHeader() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch(url: string, init: RequestInit = {}) {
  const headers = {
    ...(init.headers || {}),
    ...(await authHeader()),
  };

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
    throw new Error(body?.error || `Request failed (${res.status})`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
