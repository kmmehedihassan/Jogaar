/**
 * Browser-only data store (localStorage). Used when no backend is configured,
 * so the app is fully usable as a static site. Every visitor has their own data.
 *
 * The rules here mirror server/app.js — keep them in sync.
 */
import { seedCampaigns } from "../data/seed";
import { ApiError } from "./errors";

const DB_KEY = "jogaar:db:v1";
const LATENCY = process.env.NODE_ENV === "test" ? 0 : 200;
const DAY = 24 * 60 * 60 * 1000;

const delay = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------ storage -------------------------------- */

let memoryDb = null; // used when localStorage is unavailable

function freshDb() {
  const seeds = seedCampaigns();
  return {
    users: [],
    sessions: {},
    campaigns: seeds.map(({ seedComments, ...c }) => c),
    pledges: [],
    comments: seeds.flatMap((c) => c.seedComments),
    saved: {},
  };
}

/** Fills in fields added after a browser first stored its data. */
function migrate(db) {
  const seeds = seedCampaigns();
  db.users = db.users || [];
  db.sessions = db.sessions || {};
  db.campaigns = db.campaigns || [];
  db.pledges = db.pledges || [];
  db.saved = db.saved || {};
  if (!Array.isArray(db.comments)) db.comments = seeds.flatMap((c) => c.seedComments);
  db.campaigns.forEach((c) => {
    const seed = seeds.find((s) => s.id === c.id);
    if (!Array.isArray(c.updates)) c.updates = [];
    if (!Array.isArray(c.rewards)) c.rewards = seed ? seed.rewards : [];
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
  if (!memoryDb) memoryDb = freshDb();
  return memoryDb;
}

function saveDb(db) {
  memoryDb = db;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (err) {
    if (err && err.name === "QuotaExceededError") {
      throw new ApiError("Your browser storage is full. Try a smaller cover image.");
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
  // This store is a demo, so a simple non-cryptographic hash is acceptable here.
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

function requireUser(db, token) {
  const userId = token && db.sessions[token];
  const user = userId && db.users.find((u) => u.id === userId);
  if (!user) throw new ApiError("Your session has expired. Please log in again.", null, 401);
  return user;
}

function findCampaign(db, id) {
  const campaign = db.campaigns.find((c) => c.id === id);
  if (!campaign) throw new ApiError("This campaign no longer exists.", null, 404);
  return campaign;
}

function ownCampaign(db, user, id) {
  const campaign = findCampaign(db, id);
  if (campaign.ownerId !== user.id) throw new ApiError("Only the campaign owner can do that.", null, 403);
  return campaign;
}

/** Adds the computed `claimed` count to each reward. */
function present(db, c) {
  return {
    ...c,
    rewards: (c.rewards || []).map((r) => ({
      ...r,
      claimed: db.pledges.filter((p) => p.campaignId === c.id && p.rewardId === r.id).length,
    })),
  };
}

function splitStory(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function cleanRewards(rewards = []) {
  return rewards.slice(0, 5).map((r) => ({
    id: r.id || randomId(4),
    title: String(r.title || "").trim().slice(0, 60),
    description: String(r.description || "").trim().slice(0, 200),
    amount: Math.round(Number(r.amount)),
    ...(Number(r.limit) > 0 ? { limit: Math.round(Number(r.limit)) } : {}),
  }));
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

/* --------------------------------- auth --------------------------------- */

export async function register({ name, email, password, contact }) {
  const cleanEmail = email.trim().toLowerCase();
  await delay();
  const salt = randomId(8);
  const passwordHash = await hashPassword(password, salt);
  return update((db) => {
    if (db.users.some((u) => u.email === cleanEmail)) {
      throw new ApiError("An account with this email already exists.", "email", 409);
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
  await delay();
  const db = loadDb();
  const user = db.users.find((u) => u.email === cleanEmail);
  const ok = user && (await hashPassword(password, user.salt)) === user.passwordHash;
  if (!ok) throw new ApiError("Incorrect email or password.", null, 401);
  return update((d) => {
    const token = randomId();
    d.sessions[token] = user.id;
    return { token, user: publicUser(user) };
  });
}

export async function logout(token) {
  update((db) => {
    delete db.sessions[token];
  });
}

export async function getCurrentUser(token) {
  return publicUser(requireUser(loadDb(), token));
}

export async function updateProfile(token, { name, contact, bio }) {
  await delay();
  return update((db) => {
    const user = requireUser(db, token);
    user.name = name.trim();
    user.contact = (contact || "").trim();
    user.bio = (bio || "").trim();
    return publicUser(user);
  });
}

export async function changePassword(token, { current, next }) {
  await delay();
  const user = requireUser(loadDb(), token);
  if ((await hashPassword(current, user.salt)) !== user.passwordHash) {
    throw new ApiError("Your current password is incorrect.", "current", 400);
  }
  const salt = randomId(8);
  const passwordHash = await hashPassword(next, salt);
  update((db) => {
    const u = db.users.find((x) => x.id === user.id);
    u.salt = salt;
    u.passwordHash = passwordHash;
    // Sign out every other session.
    Object.keys(db.sessions).forEach((t) => {
      if (t !== token && db.sessions[t] === user.id) delete db.sessions[t];
    });
  });
}

/* ------------------------------- campaigns ------------------------------ */

export async function listCampaigns() {
  await delay();
  const db = loadDb();
  return db.campaigns.map((c) => present(db, c));
}

export async function getCampaign(id) {
  await delay();
  const db = loadDb();
  const campaign = db.campaigns.find((c) => c.id === id);
  if (!campaign) return null;
  const pledges = db.pledges
    .filter((p) => p.campaignId === id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ userId, ...p }) => p);
  const comments = db.comments
    .filter((m) => m.campaignId === id)
    .sort((a, b) => b.createdAt - a.createdAt);
  return { campaign: present(db, campaign), pledges, comments };
}

export async function createCampaign(token, data) {
  await delay();
  return update((db) => {
    const user = requireUser(db, token);
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
      story: splitStory(data.story),
      goal: Number(data.goal),
      raised: 0,
      backers: 0,
      rewards: cleanRewards(data.rewards),
      updates: [],
      createdAt: now,
      endsAt: now + Number(data.durationDays) * DAY,
    };
    db.campaigns.unshift(campaign);
    return present(db, campaign);
  });
}

export async function updateCampaign(token, id, data) {
  await delay();
  return update((db) => {
    const campaign = ownCampaign(db, requireUser(db, token), id);
    if (Number(data.goal) < campaign.raised) {
      throw new ApiError("The goal can't be lower than the amount already raised.", "goal", 400);
    }
    // Rewards that someone already chose can't be removed.
    const claimedIds = new Set(db.pledges.filter((p) => p.campaignId === id && p.rewardId).map((p) => p.rewardId));
    const nextRewards = cleanRewards(data.rewards);
    const kept = campaign.rewards.filter((r) => claimedIds.has(r.id) && !nextRewards.some((n) => n.id === r.id));
    campaign.title = data.title.trim();
    campaign.category = data.category;
    campaign.location = data.location.trim();
    campaign.summary = data.summary.trim();
    campaign.story = splitStory(data.story);
    campaign.goal = Number(data.goal);
    campaign.rewards = [...nextRewards, ...kept];
    if (data.image) campaign.image = data.image;
    return present(db, campaign);
  });
}

export async function deleteCampaign(token, id) {
  await delay();
  update((db) => {
    const campaign = ownCampaign(db, requireUser(db, token), id);
    if (campaign.raised > 0) {
      throw new ApiError("Campaigns that have received contributions can't be deleted.", null, 409);
    }
    db.campaigns = db.campaigns.filter((c) => c.id !== id);
    db.comments = db.comments.filter((m) => m.campaignId !== id);
    Object.keys(db.saved).forEach((uid) => {
      db.saved[uid] = db.saved[uid].filter((x) => x !== id);
    });
  });
}

export async function postUpdate(token, id, { title, body }) {
  await delay();
  return update((db) => {
    const campaign = ownCampaign(db, requireUser(db, token), id);
    campaign.updates.unshift({ id: randomId(6), title: title.trim(), body: body.trim(), createdAt: Date.now() });
    return present(db, campaign);
  });
}

export async function pledge(token, campaignId, { amount, message, method, anonymous, rewardId }) {
  const value = Math.round(Number(amount));
  if (!Number.isFinite(value) || value < 100) {
    throw new ApiError("The minimum contribution is ৳100.", "amount", 400);
  }
  if (value > 1000000) throw new ApiError("The maximum single contribution is ৳10,00,000.", "amount", 400);
  await delay();
  return update((db) => {
    const user = requireUser(db, token);
    const campaign = findCampaign(db, campaignId);
    if (campaign.endsAt <= Date.now()) throw new ApiError("This campaign has ended.", null, 409);
    if (campaign.ownerId && campaign.ownerId === user.id) {
      throw new ApiError("You can't back your own campaign.", null, 403);
    }
    let reward = null;
    if (rewardId) {
      reward = campaign.rewards.find((r) => r.id === rewardId);
      if (!reward) throw new ApiError("That reward is no longer available.", null, 409);
      if (value < reward.amount) throw new ApiError("Your contribution is below this reward's minimum.", "amount", 400);
      const claimed = db.pledges.filter((p) => p.campaignId === campaignId && p.rewardId === rewardId).length;
      if (reward.limit && claimed >= reward.limit) throw new ApiError("This reward has sold out.", null, 409);
    }
    const isRepeatBacker = db.pledges.some((p) => p.campaignId === campaignId && p.userId === user.id);
    const record = {
      id: randomId(8),
      campaignId,
      userId: user.id,
      userName: anonymous ? "Anonymous" : user.name,
      amount: value,
      message: (message || "").trim().slice(0, 280),
      method,
      rewardId: reward ? reward.id : null,
      rewardTitle: reward ? reward.title : null,
      createdAt: Date.now(),
    };
    db.pledges.push(record);
    campaign.raised += value;
    if (!isRepeatBacker) campaign.backers += 1;
    const { userId, ...publicPledge } = record;
    return { campaign: present(db, campaign), pledge: publicPledge };
  });
}

export async function addComment(token, campaignId, body) {
  const text = String(body || "").trim();
  if (text.length < 2) throw new ApiError("Write a comment first.", "body", 400);
  await delay();
  return update((db) => {
    const user = requireUser(db, token);
    const campaign = findCampaign(db, campaignId);
    const comment = {
      id: randomId(8),
      campaignId,
      userId: user.id,
      userName: user.name,
      isOwner: campaign.ownerId === user.id,
      body: text.slice(0, 1000),
      createdAt: Date.now(),
    };
    db.comments.push(comment);
    return comment;
  });
}

export async function deleteComment(token, commentId) {
  await delay();
  update((db) => {
    const user = requireUser(db, token);
    const comment = db.comments.find((m) => m.id === commentId);
    if (!comment) return;
    const campaign = db.campaigns.find((c) => c.id === comment.campaignId);
    const allowed = comment.userId === user.id || (campaign && campaign.ownerId === user.id);
    if (!allowed) throw new ApiError("You can only delete your own comments.", null, 403);
    db.comments = db.comments.filter((m) => m.id !== commentId);
  });
}

export async function getSavedIds(token) {
  const db = loadDb();
  return db.saved[requireUser(db, token).id] || [];
}

export async function toggleSaved(token, id) {
  return update((db) => {
    const user = requireUser(db, token);
    findCampaign(db, id);
    const list = db.saved[user.id] || [];
    db.saved[user.id] = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
    return db.saved[user.id];
  });
}

export async function getDashboard(token) {
  await delay();
  const db = loadDb();
  const user = requireUser(db, token);
  const myCampaigns = db.campaigns.filter((c) => c.ownerId === user.id).map((c) => present(db, c));
  const myPledges = db.pledges
    .filter((p) => p.userId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ userId, ...p }) => {
      const c = db.campaigns.find((x) => x.id === p.campaignId);
      return { ...p, campaign: c ? present(db, c) : null };
    });
  const saved = (db.saved[user.id] || [])
    .map((id) => db.campaigns.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => present(db, c));
  return { myCampaigns, myPledges, saved };
}
