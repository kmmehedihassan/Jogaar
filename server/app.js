"use strict";
/**
 * Jogaar REST API. All routes are mounted under /api by server/index.js.
 * The browser-only store in src/api/local.js follows the same rules.
 */
const crypto = require("crypto");
const express = require("express");

const DAY = 24 * 60 * 60 * 1000;
const SESSION_TTL = 30 * DAY;
const CATEGORIES = ["Food & Drink", "Crafts", "Fashion", "Agriculture", "Retail", "Services"];
const BUILT_IN_IMAGES = ["pottery", "jewellery", "cafe", "boutique", "poultry", "handloom"];
const METHODS = ["bKash", "Nagad", "Card"];
const DURATIONS = [15, 30, 45, 60];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_RE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
const MAX_IMAGE_CHARS = 1_500_000; // ~1.1 MB once decoded
const REPORT_REASONS = ["spam", "fraud", "offensive", "other"];

class HttpError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}
const fail = (status, message, field) => {
  throw new HttpError(status, message, field);
};

const randomId = (bytes = 8) => crypto.randomBytes(bytes).toString("hex");
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const str = (v) => (typeof v === "string" ? v.trim() : "");

function hashPassword(password, salt) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key.toString("hex"))))
  );
}

async function passwordMatches(password, user) {
  const actual = Buffer.from(await hashPassword(password, user.salt), "hex");
  const expected = Buffer.from(user.password_hash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** Very small in-memory limiter for login attempts (per IP + email). */
function createLimiter({ max, windowMs }) {
  const hits = new Map();
  return {
    check(key) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || entry.reset < now) {
        hits.set(key, { count: 1, reset: now + windowMs });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },
    clear(key) {
      hits.delete(key);
    },
  };
}

/**
 * @param db       better-sqlite3 database from openDb()
 * @param options  { adminEmails: string[] } — accounts with these emails are admins
 */
function createApp(db, options = {}) {
  const adminEmails = new Set(
    (options.adminEmails || (process.env.ADMIN_EMAILS || "").split(","))
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
  const isAdmin = (u) => Boolean(u && adminEmails.has(u.email));
  const api = express.Router();
  api.use(express.json({ limit: "3mb" }));
  const loginLimiter = createLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

  /* ------------------------------ helpers ------------------------------ */

  const q = {
    userById: db.prepare("SELECT * FROM users WHERE id = ?"),
    userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
    session: db.prepare("SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?"),
    campaign: db.prepare("SELECT * FROM campaigns WHERE id = ?"),
    campaigns: db.prepare("SELECT * FROM campaigns ORDER BY created_at DESC"),
    claimed: db.prepare(
      "SELECT reward_id, COUNT(*) AS n FROM pledges WHERE campaign_id = ? AND reward_id IS NOT NULL GROUP BY reward_id"
    ),
    allClaimed: db.prepare(
      "SELECT campaign_id, reward_id, COUNT(*) AS n FROM pledges WHERE reward_id IS NOT NULL GROUP BY campaign_id, reward_id"
    ),
    updates: db.prepare("SELECT * FROM updates WHERE campaign_id = ? ORDER BY created_at DESC"),
  };

  const publicUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    contact: u.contact,
    bio: u.bio,
    isAdmin: isAdmin(u),
    createdAt: u.created_at,
  });

  function presentCampaign(row, claimedMap) {
    const claimed = claimedMap || Object.fromEntries(q.claimed.all(row.id).map((r) => [r.reward_id, r.n]));
    return {
      id: row.id,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      title: row.title,
      category: row.category,
      location: row.location,
      image: row.image,
      summary: row.summary,
      story: JSON.parse(row.story),
      goal: row.goal,
      raised: row.raised,
      backers: row.backers,
      verified: Boolean(row.verified),
      hidden: Boolean(row.hidden),
      rewards: JSON.parse(row.rewards).map((r) => ({ ...r, claimed: claimed[r.id] || 0 })),
      updates: q.updates.all(row.id).map((u) => ({ id: u.id, title: u.title, body: u.body, createdAt: u.created_at })),
      createdAt: row.created_at,
      endsAt: row.ends_at,
    };
  }

  function presentAll(rows) {
    const map = {};
    for (const r of q.allClaimed.all()) (map[r.campaign_id] = map[r.campaign_id] || {})[r.reward_id] = r.n;
    return rows.map((row) => presentCampaign(row, map[row.id] || {}));
  }

  const presentPledge = (p) => ({
    id: p.id,
    campaignId: p.campaign_id,
    userName: p.user_name,
    amount: p.amount,
    message: p.message,
    method: p.method,
    rewardId: p.reward_id,
    rewardTitle: p.reward_title,
    createdAt: p.created_at,
  });

  const presentComment = (m) => ({
    id: m.id,
    campaignId: m.campaign_id,
    userId: m.user_id,
    userName: m.user_name,
    isOwner: Boolean(m.is_owner),
    body: m.body,
    createdAt: m.created_at,
  });

  function startSession(userId) {
    const token = randomId(32);
    const now = Date.now();
    db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
      sha256(token),
      userId,
      now,
      now + SESSION_TTL
    );
    return token;
  }

  /** The signed-in user, or null (for routes that work either way). */
  function optionalUser(req) {
    const header = req.get("authorization") || "";
    if (!header.startsWith("Bearer ")) return null;
    const session = q.session.get(sha256(header.slice(7)), Date.now());
    return (session && q.userById.get(session.user_id)) || null;
  }

  const insertNotification = db.prepare(`INSERT INTO notifications
    (id, user_id, type, campaign_id, campaign_title, actor_name, amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  function notify(userId, type, row, actorName = "", amount = null) {
    if (!userId) return;
    insertNotification.run(randomId(8), userId, type, row.id, row.title, actorName, amount, Date.now());
  }

  function auth(req) {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const session = token && q.session.get(sha256(token), Date.now());
    const user = session && q.userById.get(session.user_id);
    if (!user) fail(401, "Your session has expired. Please log in again.");
    req.tokenHash = sha256(token);
    return user;
  }

  function findCampaign(id, viewer) {
    const row = q.campaign.get(id);
    if (!row) fail(404, "This campaign no longer exists.");
    // Hidden campaigns are only visible to their owner and admins.
    if (row.hidden && !(viewer && (viewer.id === row.owner_id || isAdmin(viewer)))) {
      fail(404, "This campaign no longer exists.");
    }
    return row;
  }

  function ownCampaign(user, id) {
    const row = findCampaign(id, user);
    if (row.owner_id !== user.id) fail(403, "Only the campaign owner can do that.");
    return row;
  }

  function validateRewards(input) {
    if (input === undefined) return [];
    if (!Array.isArray(input) || input.length > 5) fail(400, "A campaign can have up to 5 rewards.", "rewards");
    return input.map((r) => {
      const title = str(r && r.title).slice(0, 60);
      const amount = Math.round(Number(r && r.amount));
      const limit = Math.round(Number(r && r.limit));
      if (title.length < 2) fail(400, "Every reward needs a title.", "rewards");
      if (!Number.isFinite(amount) || amount < 100 || amount > 1000000)
        fail(400, "Reward amounts must be between ৳100 and ৳10,00,000.", "rewards");
      return {
        id: typeof r.id === "string" && /^[\w-]{1,32}$/.test(r.id) ? r.id : randomId(4),
        title,
        description: str(r.description).slice(0, 200),
        amount,
        ...(limit > 0 ? { limit: Math.min(limit, 100000) } : {}),
      };
    });
  }

  function validateImage(image, required) {
    if (!image) {
      if (required) fail(400, "Choose a cover image.", "image");
      return null;
    }
    if (BUILT_IN_IMAGES.includes(image)) return image;
    if (typeof image === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) {
      if (image.length > MAX_IMAGE_CHARS) fail(400, "That image is too large.", "image");
      return image;
    }
    return fail(400, "That image format isn't supported.", "image");
  }

  function validateCampaign(body, { minGoal = 0, creating }) {
    const title = str(body.title);
    const location = str(body.location);
    const summary = str(body.summary);
    const story = str(body.story);
    const goal = Math.round(Number(body.goal));
    if (title.length < 5 || title.length > 70) fail(400, "Give your campaign a title of 5–70 characters.", "title");
    if (!CATEGORIES.includes(body.category)) fail(400, "Choose a category.", "category");
    if (!location || location.length > 80) fail(400, "Where is your business based?", "location");
    if (!Number.isFinite(goal) || goal < Math.max(10000, minGoal) || goal > 10000000)
      fail(400, "That funding goal isn't allowed.", "goal");
    if (summary.length < 20 || summary.length > 140) fail(400, "Write a summary of 20–140 characters.", "summary");
    if (story.length < 100 || story.length > 10000) fail(400, "Your story must be at least 100 characters.", "story");
    const durationDays = Number(body.durationDays);
    if (creating && !DURATIONS.includes(durationDays)) fail(400, "Choose a campaign duration.", "durationDays");
    return {
      title,
      category: body.category,
      location,
      summary,
      goal,
      durationDays,
      story: JSON.stringify(
        story
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean)
      ),
      rewards: validateRewards(body.rewards),
    };
  }

  const slugify = (t) =>
    t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "campaign";

  // Wraps async handlers so thrown errors reach the error middleware.
  const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  /* -------------------------------- auth -------------------------------- */

  api.post(
    "/auth/register",
    h(async (req, res) => {
      const name = str(req.body.name);
      const email = str(req.body.email).toLowerCase();
      const password = typeof req.body.password === "string" ? req.body.password : "";
      const contact = str(req.body.contact);
      if (name.length < 2 || name.length > 80) fail(400, "Please enter your full name.", "name");
      if (!EMAIL_RE.test(email)) fail(400, "Enter a valid email address.", "email");
      if (!PASSWORD_RE.test(password))
        fail(400, "Use at least 8 characters with an uppercase letter, a lowercase letter and a number.", "password");
      if (contact && !/^\+?[0-9\s-]{7,15}$/.test(contact)) fail(400, "Enter a valid phone number.", "contact");
      if (q.userByEmail.get(email)) fail(409, "An account with this email already exists.", "email");
      const salt = randomId(16);
      const user = {
        id: randomId(8),
        name,
        email,
        contact,
        bio: "",
        salt,
        password_hash: await hashPassword(password, salt),
        created_at: Date.now(),
      };
      db.prepare(
        "INSERT INTO users (id, name, email, contact, bio, salt, password_hash, created_at) VALUES (@id, @name, @email, @contact, @bio, @salt, @password_hash, @created_at)"
      ).run(user);
      res.status(201).json({ token: startSession(user.id), user: publicUser(user) });
    })
  );

  api.post(
    "/auth/login",
    h(async (req, res) => {
      const email = str(req.body.email).toLowerCase();
      const password = typeof req.body.password === "string" ? req.body.password : "";
      const key = `${req.ip}|${email}`;
      if (!loginLimiter.check(key)) fail(429, "Too many login attempts. Please wait 15 minutes and try again.");
      const user = q.userByEmail.get(email);
      if (!user || !(await passwordMatches(password, user))) fail(401, "Incorrect email or password.");
      loginLimiter.clear(key);
      res.json({ token: startSession(user.id), user: publicUser(user) });
    })
  );

  api.post(
    "/auth/logout",
    h(async (req, res) => {
      auth(req);
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(req.tokenHash);
      res.status(204).end();
    })
  );

  api.get(
    "/auth/me",
    h(async (req, res) => res.json(publicUser(auth(req))))
  );

  api.patch(
    "/auth/me",
    h(async (req, res) => {
      const user = auth(req);
      const name = str(req.body.name);
      const contact = str(req.body.contact);
      const bio = str(req.body.bio).slice(0, 300);
      if (name.length < 2 || name.length > 80) fail(400, "Please enter your full name.", "name");
      if (contact && !/^\+?[0-9\s-]{7,15}$/.test(contact)) fail(400, "Enter a valid phone number.", "contact");
      db.prepare("UPDATE users SET name = ?, contact = ?, bio = ? WHERE id = ?").run(name, contact, bio, user.id);
      res.json(publicUser(q.userById.get(user.id)));
    })
  );

  api.post(
    "/auth/password",
    h(async (req, res) => {
      const user = auth(req);
      const current = typeof req.body.current === "string" ? req.body.current : "";
      const next = typeof req.body.next === "string" ? req.body.next : "";
      if (!(await passwordMatches(current, user))) fail(400, "Your current password is incorrect.", "current");
      if (!PASSWORD_RE.test(next))
        fail(400, "Use at least 8 characters with an uppercase letter, a lowercase letter and a number.", "next");
      const salt = randomId(16);
      const hash = await hashPassword(next, salt);
      db.transaction(() => {
        db.prepare("UPDATE users SET salt = ?, password_hash = ? WHERE id = ?").run(salt, hash, user.id);
        db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").run(user.id, req.tokenHash);
      })();
      res.status(204).end();
    })
  );

  /* ------------------------------ campaigns ----------------------------- */

  api.get(
    "/campaigns",
    h(async (req, res) => res.json(presentAll(q.campaigns.all().filter((r) => !r.hidden))))
  );

  api.get(
    "/campaigns/:id",
    h(async (req, res) => {
      const row = findCampaign(req.params.id, optionalUser(req));
      const pledges = db
        .prepare("SELECT * FROM pledges WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 100")
        .all(row.id)
        .map(presentPledge);
      const comments = db
        .prepare("SELECT * FROM comments WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 200")
        .all(row.id)
        .map(presentComment);
      res.json({ campaign: presentCampaign(row), pledges, comments });
    })
  );

  api.post(
    "/campaigns",
    h(async (req, res) => {
      const user = auth(req);
      const v = validateCampaign(req.body, { creating: true });
      const image = validateImage(req.body.image, true);
      const now = Date.now();
      const id = `${slugify(v.title)}-${randomId(3)}`;
      db.prepare(`INSERT INTO campaigns
        (id, owner_id, owner_name, title, category, location, image, summary, story, goal, raised, backers, rewards, created_at, ends_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`).run(
        id,
        user.id,
        user.name,
        v.title,
        v.category,
        v.location,
        image,
        v.summary,
        v.story,
        v.goal,
        JSON.stringify(v.rewards),
        now,
        now + v.durationDays * DAY
      );
      res.status(201).json(presentCampaign(q.campaign.get(id)));
    })
  );

  api.patch(
    "/campaigns/:id",
    h(async (req, res) => {
      const user = auth(req);
      const row = ownCampaign(user, req.params.id);
      if (Number(req.body.goal) < row.raised)
        fail(400, "The goal can't be lower than the amount already raised.", "goal");
      const v = validateCampaign(req.body, { minGoal: row.raised });
      const image = validateImage(req.body.image, false) || row.image;
      // Rewards someone already chose are kept even if removed from the form.
      const claimedIds = new Set(q.claimed.all(row.id).map((r) => r.reward_id));
      const kept = JSON.parse(row.rewards).filter((r) => claimedIds.has(r.id) && !v.rewards.some((n) => n.id === r.id));
      db.prepare(
        "UPDATE campaigns SET title = ?, category = ?, location = ?, summary = ?, story = ?, goal = ?, rewards = ?, image = ? WHERE id = ?"
      ).run(v.title, v.category, v.location, v.summary, v.story, v.goal, JSON.stringify([...v.rewards, ...kept]), image, row.id);
      res.json(presentCampaign(q.campaign.get(row.id)));
    })
  );

  api.delete(
    "/campaigns/:id",
    h(async (req, res) => {
      const row = ownCampaign(auth(req), req.params.id);
      if (row.raised > 0) fail(409, "Campaigns that have received contributions can't be deleted.");
      db.prepare("DELETE FROM campaigns WHERE id = ?").run(row.id);
      res.status(204).end();
    })
  );

  api.post(
    "/campaigns/:id/updates",
    h(async (req, res) => {
      const row = ownCampaign(auth(req), req.params.id);
      const title = str(req.body.title).slice(0, 80);
      const body = str(req.body.body).slice(0, 1000);
      if (title.length < 3 || body.length < 10) fail(400, "Add a title and a few sentences for your backers.");
      db.transaction(() => {
        db.prepare("INSERT INTO updates (id, campaign_id, title, body, created_at) VALUES (?, ?, ?, ?, ?)").run(
          randomId(6),
          row.id,
          title,
          body,
          Date.now()
        );
        const backerIds = db.prepare("SELECT DISTINCT user_id FROM pledges WHERE campaign_id = ?").all(row.id);
        for (const b of backerIds) notify(b.user_id, "update", row, row.owner_name);
      })();
      res.status(201).json(presentCampaign(q.campaign.get(row.id)));
    })
  );

  api.post(
    "/campaigns/:id/pledges",
    h(async (req, res) => {
      const user = auth(req);
      const amount = Math.round(Number(req.body.amount));
      if (!Number.isFinite(amount) || amount < 100) fail(400, "The minimum contribution is ৳100.", "amount");
      if (amount > 1000000) fail(400, "The maximum single contribution is ৳10,00,000.", "amount");
      const method = METHODS.includes(req.body.method) ? req.body.method : fail(400, "Choose a payment method.", "method");

      const pledge = db.transaction(() => {
        const row = findCampaign(req.params.id, user);
        if (row.hidden) fail(409, "This campaign is under review.");
        if (row.ends_at <= Date.now()) fail(409, "This campaign has ended.");
        if (row.owner_id === user.id) fail(403, "You can't back your own campaign.");
        let reward = null;
        if (req.body.rewardId) {
          reward = JSON.parse(row.rewards).find((r) => r.id === req.body.rewardId);
          if (!reward) fail(409, "That reward is no longer available.");
          if (amount < reward.amount) fail(400, "Your contribution is below this reward's minimum.", "amount");
          const claimed = db
            .prepare("SELECT COUNT(*) AS n FROM pledges WHERE campaign_id = ? AND reward_id = ?")
            .get(row.id, reward.id).n;
          if (reward.limit && claimed >= reward.limit) fail(409, "This reward has sold out.");
        }
        const repeat = db.prepare("SELECT 1 FROM pledges WHERE campaign_id = ? AND user_id = ?").get(row.id, user.id);
        const record = {
          id: randomId(8),
          campaign_id: row.id,
          user_id: user.id,
          user_name: req.body.anonymous ? "Anonymous" : user.name,
          amount,
          message: str(req.body.message).slice(0, 280),
          method,
          reward_id: reward ? reward.id : null,
          reward_title: reward ? reward.title : null,
          created_at: Date.now(),
        };
        db.prepare(`INSERT INTO pledges (id, campaign_id, user_id, user_name, amount, message, method, reward_id, reward_title, created_at)
          VALUES (@id, @campaign_id, @user_id, @user_name, @amount, @message, @method, @reward_id, @reward_title, @created_at)`).run(record);
        db.prepare("UPDATE campaigns SET raised = raised + ?, backers = backers + ? WHERE id = ?").run(
          amount,
          repeat ? 0 : 1,
          row.id
        );
        notify(row.owner_id, "pledge", row, record.user_name, amount);
        return record;
      })();

      res.status(201).json({ campaign: presentCampaign(q.campaign.get(pledge.campaign_id)), pledge: presentPledge(pledge) });
    })
  );

  /* ------------------------------ comments ------------------------------ */

  api.post(
    "/campaigns/:id/comments",
    h(async (req, res) => {
      const user = auth(req);
      const row = findCampaign(req.params.id, user);
      const body = str(req.body.body).slice(0, 1000);
      if (body.length < 2) fail(400, "Write a comment first.", "body");
      const comment = {
        id: randomId(8),
        campaign_id: row.id,
        user_id: user.id,
        user_name: user.name,
        is_owner: row.owner_id === user.id ? 1 : 0,
        body,
        created_at: Date.now(),
      };
      db.prepare(`INSERT INTO comments (id, campaign_id, user_id, user_name, is_owner, body, created_at)
        VALUES (@id, @campaign_id, @user_id, @user_name, @is_owner, @body, @created_at)`).run(comment);
      if (row.owner_id !== user.id) notify(row.owner_id, "comment", row, user.name);
      res.status(201).json(presentComment(comment));
    })
  );

  api.delete(
    "/comments/:id",
    h(async (req, res) => {
      const user = auth(req);
      const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
      if (comment) {
        const row = q.campaign.get(comment.campaign_id);
        if (comment.user_id !== user.id && !(row && row.owner_id === user.id) && !isAdmin(user))
          fail(403, "You can only delete your own comments.");
        db.prepare("DELETE FROM comments WHERE id = ?").run(comment.id);
      }
      res.status(204).end();
    })
  );

  /* ----------------------------- current user --------------------------- */

  const savedIds = (userId) =>
    db
      .prepare("SELECT campaign_id FROM saved WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId)
      .map((r) => r.campaign_id);

  api.get(
    "/me/saved",
    h(async (req, res) => res.json(savedIds(auth(req).id)))
  );

  api.post(
    "/me/saved/:id",
    h(async (req, res) => {
      const user = auth(req);
      const row = findCampaign(req.params.id, user);
      const existing = db.prepare("SELECT 1 FROM saved WHERE user_id = ? AND campaign_id = ?").get(user.id, row.id);
      if (existing) db.prepare("DELETE FROM saved WHERE user_id = ? AND campaign_id = ?").run(user.id, row.id);
      else db.prepare("INSERT INTO saved (user_id, campaign_id, created_at) VALUES (?, ?, ?)").run(user.id, row.id, Date.now());
      res.json(savedIds(user.id));
    })
  );

  api.get(
    "/me/dashboard",
    h(async (req, res) => {
      const user = auth(req);
      const myCampaigns = presentAll(
        db.prepare("SELECT * FROM campaigns WHERE owner_id = ? ORDER BY created_at DESC").all(user.id)
      );
      const myPledges = db
        .prepare("SELECT * FROM pledges WHERE user_id = ? ORDER BY created_at DESC")
        .all(user.id)
        .map((p) => {
          const row = q.campaign.get(p.campaign_id);
          return { ...presentPledge(p), campaign: row ? presentCampaign(row) : null };
        });
      const saved = presentAll(
        db
          .prepare(
            "SELECT c.* FROM saved s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ? AND c.hidden = 0 ORDER BY s.created_at DESC"
          )
          .all(user.id)
      );
      res.json({ myCampaigns, myPledges, saved });
    })
  );

  /* ---------------------------- notifications --------------------------- */

  api.get(
    "/me/notifications",
    h(async (req, res) => {
      const user = auth(req);
      const items = db
        .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30")
        .all(user.id)
        .map((n) => ({
          id: n.id,
          type: n.type,
          campaignId: n.campaign_id,
          campaignTitle: n.campaign_title,
          actorName: n.actor_name,
          amount: n.amount,
          read: Boolean(n.read_at),
          createdAt: n.created_at,
        }));
      const unread = db
        .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL")
        .get(user.id).n;
      res.json({ items, unread });
    })
  );

  api.post(
    "/me/notifications/read",
    h(async (req, res) => {
      const user = auth(req);
      db.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(Date.now(), user.id);
      res.status(204).end();
    })
  );

  /* ------------------------------- reports ------------------------------ */

  api.post(
    "/reports",
    h(async (req, res) => {
      const user = auth(req);
      const targetType = req.body.targetType;
      const reason = req.body.reason;
      if (!["campaign", "comment"].includes(targetType)) fail(400, "Invalid request.");
      if (!REPORT_REASONS.includes(reason)) fail(400, "Choose a reason.", "reason");
      let campaignId;
      if (targetType === "campaign") {
        campaignId = findCampaign(String(req.body.targetId || ""), user).id;
      } else {
        const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(String(req.body.targetId || ""));
        if (!comment) fail(404, "That comment no longer exists.");
        campaignId = comment.campaign_id;
      }
      const targetId = targetType === "campaign" ? campaignId : String(req.body.targetId);
      const existing = db
        .prepare("SELECT 1 FROM reports WHERE user_id = ? AND target_type = ? AND target_id = ? AND resolved_at IS NULL")
        .get(user.id, targetType, targetId);
      if (!existing) {
        db.prepare(`INSERT INTO reports (id, target_type, target_id, campaign_id, user_id, reason, details, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
          randomId(8),
          targetType,
          targetId,
          campaignId,
          user.id,
          reason,
          str(req.body.details).slice(0, 300),
          Date.now()
        );
      }
      res.status(201).json({ ok: true });
    })
  );

  /* -------------------------------- admin ------------------------------- */

  function requireAdmin(req) {
    const user = auth(req);
    if (!isAdmin(user)) fail(403, "Only admins can do that.");
    return user;
  }

  api.get(
    "/admin/overview",
    h(async (req, res) => {
      requireAdmin(req);
      const count = (sql) => db.prepare(sql).get().n;
      const reports = db
        .prepare(
          `SELECT r.*, u.name AS reporter_name, c.title AS campaign_title, m.body AS comment_body, m.user_name AS comment_author
           FROM reports r
           JOIN users u ON u.id = r.user_id
           LEFT JOIN campaigns c ON c.id = r.campaign_id
           LEFT JOIN comments m ON r.target_type = 'comment' AND m.id = r.target_id
           WHERE r.resolved_at IS NULL
           ORDER BY r.created_at DESC`
        )
        .all()
        .map((r) => ({
          id: r.id,
          targetType: r.target_type,
          targetId: r.target_id,
          campaignId: r.campaign_id,
          campaignTitle: r.campaign_title,
          commentBody: r.comment_body,
          commentAuthor: r.comment_author,
          reason: r.reason,
          details: r.details,
          reporterName: r.reporter_name,
          createdAt: r.created_at,
        }));
      res.json({
        stats: {
          users: count("SELECT COUNT(*) AS n FROM users"),
          campaigns: count("SELECT COUNT(*) AS n FROM campaigns"),
          pledges: count("SELECT COUNT(*) AS n FROM pledges"),
          raised: count("SELECT COALESCE(SUM(amount), 0) AS n FROM pledges"),
          openReports: reports.length,
        },
        campaigns: presentAll(q.campaigns.all()),
        reports,
      });
    })
  );

  api.patch(
    "/admin/campaigns/:id",
    h(async (req, res) => {
      requireAdmin(req);
      const row = q.campaign.get(req.params.id);
      if (!row) fail(404, "This campaign no longer exists.");
      const verified = typeof req.body.verified === "boolean" ? req.body.verified : Boolean(row.verified);
      const hidden = typeof req.body.hidden === "boolean" ? req.body.hidden : Boolean(row.hidden);
      db.prepare("UPDATE campaigns SET verified = ?, hidden = ? WHERE id = ?").run(verified ? 1 : 0, hidden ? 1 : 0, row.id);
      if (verified && !row.verified) notify(row.owner_id, "verified", row);
      if (hidden && !row.hidden) notify(row.owner_id, "hidden", row);
      res.json(presentCampaign(q.campaign.get(row.id)));
    })
  );

  api.post(
    "/admin/reports/:id/resolve",
    h(async (req, res) => {
      requireAdmin(req);
      const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id);
      if (!report) fail(404, "That report no longer exists.");
      const action = req.body.action === "remove" ? "remove" : "dismiss";
      db.transaction(() => {
        if (action === "remove") {
          if (report.target_type === "comment") {
            db.prepare("DELETE FROM comments WHERE id = ?").run(report.target_id);
          } else {
            const row = q.campaign.get(report.target_id);
            if (row && !row.hidden) {
              db.prepare("UPDATE campaigns SET hidden = 1 WHERE id = ?").run(row.id);
              notify(row.owner_id, "hidden", row);
            }
          }
        }
        // Resolve every open report about the same thing.
        db.prepare("UPDATE reports SET resolved_at = ? WHERE target_type = ? AND target_id = ? AND resolved_at IS NULL").run(
          Date.now(),
          report.target_type,
          report.target_id
        );
      })();
      res.status(204).end();
    })
  );

  api.get("/health", (req, res) => res.json({ ok: true }));

  api.use((req, res) => res.status(404).json({ error: "Not found." }));

  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, ...(err.field ? { field: err.field } : {}) });
      return;
    }
    if (err.type === "entity.too.large") {
      res.status(413).json({ error: "That upload is too large." });
      return;
    }
    if (err.type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid request." });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong on our side. Please try again." });
  });

  const app = express();
  app.disable("x-powered-by");
  app.use("/api", api);
  return app;
}

module.exports = { createApp };
