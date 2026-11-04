/**
 * Jogaar data layer.
 *
 * By default everything runs against a local, browser-only store so the app is
 * fully usable without a server. Set REACT_APP_API_URL (e.g. in `.env.local`)
 * to send authentication to a real backend instead:
 *
 *   POST {API}/users          JSON { name, email, password }   -> created user
 *   POST {API}/login          form  username=<email>&password=  -> { access_token }
 *   GET  {API}/users/current  Bearer token                      -> { id, name, email, created_at }
 *
 * Campaigns and pledges always use the local store until the backend exposes
 * endpoints for them.
 */
import { seedCampaigns } from "../data/seed";

const API_URL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
export const USING_REMOTE_AUTH = Boolean(API_URL);

const DB_KEY = "jogaar:db:v1";
const LATENCY = process.env.NODE_ENV === "test" ? 0 : 250;

export class ApiError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ApiError";
    this.field = field;
  }
}

const delay = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms));

/* ----------------------------- local store ------------------------------ */

let memoryDb = null; // used when localStorage is unavailable

function freshDb() {
  return {
    users: [],
    sessions: {},
    campaigns: seedCampaigns(),
    pledges: [],
    saved: {},
  };
}

/** Fills in fields added after a browser first stored its data. */
function migrate(db) {
  db.users = db.users || [];
  db.sessions = db.sessions || {};
  db.campaigns = db.campaigns || [];
  db.pledges = db.pledges || [];
  db.saved = db.saved || {};
  db.campaigns.forEach((c) => {
    if (!Array.isArray(c.updates)) c.updates = [];
  });
  return db;
}

function loadDb() {
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (_) {
    /* fall through */
  }
  if (!memoryDb) memoryDb = migrate(freshDb());
  return memoryDb;
}

function saveDb(db) {
  memoryDb = db;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (err) {
    if (err && err.name === "QuotaExceededError") {
      throw new ApiError(
        "Your browser storage is full. Try a smaller cover image."
      );
    }
  }
}

function update(mutator) {
  const db = loadDb();
  const result = mutator(db);
  saveDb(db);
  return result;
}

export function resetLocalData() {
  memoryDb = null;
  try {
    window.localStorage.removeItem(DB_KEY);
  } catch (_) {}
}

function randomId(bytes = 16) {
  const arr = new Uint8Array(bytes);
  const c = typeof window !== "undefined" && window.crypto;
  if (c && c.getRandomValues) c.getRandomValues(arr);
  else for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  const input = `${salt}:${password}`;
  const subtle = typeof window !== "undefined" && window.crypto && window.crypto.subtle;
  if (subtle) {
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Non-secure contexts (plain http on a LAN IP) have no SubtleCrypto.
  // This local store is a demo, so a simple non-cryptographic hash is acceptable.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  return `fallback-${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    contact: u.contact || "",
    bio: u.bio || "",
    createdAt: u.createdAt,
  };
}

function userForToken(db, token) {
  const userId = token && db.sessions[token];
  return userId ? db.users.find((u) => u.id === userId) : null;
}

/* --------------------------------- auth --------------------------------- */

async function remote(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { Accept: "application/json", ...(options.headers || {}) },
    });
  } catch (_) {
    throw new ApiError("Cannot reach the server. Please try again later.");
  }
  let body = null;
  try {
    body = await res.json();
  } catch (_) {}
  if (!res.ok) {
    const detail = body && body.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail) && detail[0] && detail[0].msg
        ? detail[0].msg
        : `Request failed (${res.status})`;
    throw new ApiError(msg);
  }
  return body;
}

function normaliseRemoteUser(u) {
  return {
    id: String(u.id),
    name: u.name || "",
    email: u.email || "",
    contact: u.contact || "",
    bio: u.bio || "",
    createdAt: u.created_at ? Date.parse(u.created_at) : Date.now(),
  };
}

export async function register({ name, email, password, contact }) {
  const cleanEmail = email.trim().toLowerCase();
  if (USING_REMOTE_AUTH) {
    await remote("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: cleanEmail, password }),
    });
    return login({ email: cleanEmail, password });
  }

  await delay();
  const salt = randomId(8);
  const passwordHash = await hashPassword(password, salt);
  return update((db) => {
    if (db.users.some((u) => u.email === cleanEmail)) {
      throw new ApiError("An account with this email already exists.", "email");
    }
    const user = {
      id: randomId(8),
      name: name.trim(),
      email: cleanEmail,
      contact: (contact || "").trim(),
      bio: "",
      salt,
      passwordHash,
      createdAt: Date.now(),
    };
    db.users.push(user);
    const token = randomId();
    db.sessions[token] = user.id;
    return { token, user: publicUser(user) };
  });
}

export async function login({ email, password }) {
  const cleanEmail = email.trim().toLowerCase();
  if (USING_REMOTE_AUTH) {
    const form = new URLSearchParams({ username: cleanEmail, password });
    const { access_token: token } = await remote("/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const user = await getCurrentUser(token);
    return { token, user };
  }

  await delay();
  const db = loadDb();
  const user = db.users.find((u) => u.email === cleanEmail);
  const ok = user && (await hashPassword(password, user.salt)) === user.passwordHash;
  if (!ok) throw new ApiError("Incorrect email or password.");
  return update((d) => {
    const token = randomId();
    d.sessions[token] = user.id;
    return { token, user: publicUser(user) };
  });
}

export async function logout(token) {
  if (USING_REMOTE_AUTH) return;
  update((db) => {
    delete db.sessions[token];
  });
}

export async function getCurrentUser(token) {
  if (USING_REMOTE_AUTH) {
    const u = await remote("/users/current", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return normaliseRemoteUser(u);
  }
  const user = userForToken(loadDb(), token);
  if (!user) throw new ApiError("Your session has expired. Please log in again.");
  return publicUser(user);
}

export async function updateProfile(token, { name, contact, bio }) {
  if (USING_REMOTE_AUTH) {
    throw new ApiError("Editing your profile is not supported by the server yet.");
  }
  await delay();
  return update((db) => {
    const user = userForToken(db, token);
    if (!user) throw new ApiError("Your session has expired. Please log in again.");
    user.name = name.trim();
    user.contact = (contact || "").trim();
    user.bio = (bio || "").trim();
    return publicUser(user);
  });
}

export async function changePassword(token, { current, next }) {
  if (USING_REMOTE_AUTH) {
    throw new ApiError("Changing your password is not supported by the server yet.");
  }
  await delay();
  const db = loadDb();
  const user = userForToken(db, token);
  if (!user) throw new ApiError("Your session has expired. Please log in again.");
  if ((await hashPassword(current, user.salt)) !== user.passwordHash) {
    throw new ApiError("Your current password is incorrect.", "current");
  }
  const salt = randomId(8);
  const passwordHash = await hashPassword(next, salt);
  update((d) => {
    const u = d.users.find((x) => x.id === user.id);
    u.salt = salt;
    u.passwordHash = passwordHash;
    // Sign out every other session.
    Object.keys(d.sessions).forEach((t) => {
      if (t !== token && d.sessions[t] === user.id) delete d.sessions[t];
    });
  });
}

/* ------------------------------- campaigns ------------------------------ */

export async function listCampaigns() {
  await delay();
  return loadDb().campaigns.slice();
}

export async function getCampaign(id) {
  await delay();
  const db = loadDb();
  const campaign = db.campaigns.find((c) => c.id === id);
  if (!campaign) return null;
  const pledges = db.pledges
    .filter((p) => p.campaignId === id)
    .sort((a, b) => b.createdAt - a.createdAt);
  return { campaign, pledges };
}

function slugify(text) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "campaign"
  );
}

export async function createCampaign(user, data) {
  if (!user) throw new ApiError("Please log in to start a campaign.");
  await delay();
  return update((db) => {
    const now = Date.now();
    const campaign = {
      id: `${slugify(data.title)}-${randomId(3)}`,
      title: data.title.trim(),
      ownerId: user.id,
      ownerName: user.name,
      category: data.category,
      location: data.location.trim(),
      image: data.image,
      summary: data.summary.trim(),
      story: data.story
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
      goal: Number(data.goal),
      raised: 0,
      backers: 0,
      updates: [],
      createdAt: now,
      endsAt: now + Number(data.durationDays) * 24 * 60 * 60 * 1000,
    };
    db.campaigns.unshift(campaign);
    return campaign;
  });
}

function ownCampaign(db, user, id) {
  if (!user) throw new ApiError("Please log in first.");
  const campaign = db.campaigns.find((c) => c.id === id);
  if (!campaign) throw new ApiError("This campaign no longer exists.");
  if (campaign.ownerId !== user.id) throw new ApiError("Only the campaign owner can do that.");
  return campaign;
}

export async function updateCampaign(user, id, data) {
  await delay();
  return update((db) => {
    const campaign = ownCampaign(db, user, id);
    campaign.title = data.title.trim();
    campaign.category = data.category;
    campaign.location = data.location.trim();
    campaign.summary = data.summary.trim();
    campaign.story = data.story
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    campaign.goal = Number(data.goal);
    if (data.image) campaign.image = data.image;
    return { ...campaign };
  });
}

export async function postUpdate(user, id, { title, body }) {
  await delay();
  return update((db) => {
    const campaign = ownCampaign(db, user, id);
    const entry = {
      id: randomId(6),
      title: title.trim(),
      body: body.trim(),
      createdAt: Date.now(),
    };
    campaign.updates.unshift(entry);
    return { ...campaign };
  });
}

export async function deleteCampaign(user, id) {
  await delay();
  update((db) => {
    const campaign = ownCampaign(db, user, id);
    if (campaign.raised > 0) {
      throw new ApiError("Campaigns that have received contributions can't be deleted.");
    }
    db.campaigns = db.campaigns.filter((c) => c.id !== id);
    Object.keys(db.saved).forEach((uid) => {
      db.saved[uid] = db.saved[uid].filter((x) => x !== id);
    });
  });
}

export function getSavedIds(user) {
  if (!user) return [];
  return loadDb().saved[user.id] || [];
}

export async function toggleSaved(user, id) {
  if (!user) throw new ApiError("Log in to save campaigns.");
  return update((db) => {
    const list = db.saved[user.id] || [];
    db.saved[user.id] = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
    return db.saved[user.id];
  });
}

export async function pledge(user, campaignId, { amount, message, method, anonymous }) {
  if (!user) throw new ApiError("Please log in to back this campaign.");
  const value = Math.round(Number(amount));
  if (!Number.isFinite(value) || value < 100) {
    throw new ApiError("The minimum contribution is ৳100.", "amount");
  }
  await delay();
  return update((db) => {
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) throw new ApiError("This campaign no longer exists.");
    if (campaign.endsAt <= Date.now()) throw new ApiError("This campaign has ended.");
    if (campaign.ownerId && campaign.ownerId === user.id) {
      throw new ApiError("You can't back your own campaign.");
    }
    const isRepeatBacker = db.pledges.some(
      (p) => p.campaignId === campaignId && p.userId === user.id
    );
    const record = {
      id: randomId(8),
      campaignId,
      userId: user.id,
      userName: anonymous ? "Anonymous" : user.name,
      amount: value,
      message: (message || "").trim().slice(0, 280),
      method,
      createdAt: Date.now(),
    };
    db.pledges.push(record);
    campaign.raised += value;
    if (!isRepeatBacker) campaign.backers += 1;
    return { campaign: { ...campaign }, pledge: record };
  });
}

export async function getDashboard(user) {
  await delay();
  const db = loadDb();
  const myCampaigns = db.campaigns.filter((c) => c.ownerId === user.id);
  const myPledges = db.pledges
    .filter((p) => p.userId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((p) => ({
      ...p,
      campaign: db.campaigns.find((c) => c.id === p.campaignId) || null,
    }));
  const saved = (db.saved[user.id] || [])
    .map((id) => db.campaigns.find((c) => c.id === id))
    .filter(Boolean);
  return { myCampaigns, myPledges, saved };
}
