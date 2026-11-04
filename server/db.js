"use strict";
/**
 * SQLite storage for the Jogaar server.
 * The database file defaults to server/data/jogaar.db (set JOGAAR_DB to change it,
 * or ":memory:" for a throwaway database).
 */
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DAY = 24 * 60 * 60 * 1000;
const SEED_FILE = path.join(__dirname, "..", "src", "data", "campaigns.json");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  contact TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  owner_name TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  image TEXT NOT NULL,
  summary TEXT NOT NULL,
  story TEXT NOT NULL,
  goal INTEGER NOT NULL,
  raised INTEGER NOT NULL DEFAULT 0,
  backers INTEGER NOT NULL DEFAULT 0,
  rewards TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS updates (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pledges (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL,
  reward_id TEXT,
  reward_title TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  is_owner INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS saved (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, campaign_id)
);
CREATE INDEX IF NOT EXISTS idx_pledges_campaign ON pledges(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pledges_user ON pledges(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_campaign ON comments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_updates_campaign ON updates(campaign_id);
`;

function seed(db, now = Date.now()) {
  const raw = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  const insertCampaign = db.prepare(`INSERT INTO campaigns
    (id, owner_id, owner_name, title, category, location, image, summary, story, goal, raised, backers, rewards, created_at, ends_at)
    VALUES (@id, NULL, @ownerName, @title, @category, @location, @image, @summary, @story, @goal, @raised, @backers, @rewards, @createdAt, @endsAt)`);
  const insertUpdate = db.prepare(
    "INSERT INTO updates (id, campaign_id, title, body, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const insertComment = db.prepare(
    "INSERT INTO comments (id, campaign_id, user_id, user_name, is_owner, body, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)"
  );
  db.transaction(() => {
    for (const c of raw) {
      insertCampaign.run({
        ...c,
        story: JSON.stringify(c.story),
        rewards: JSON.stringify(c.rewards || []),
        createdAt: now - c.createdDaysAgo * DAY,
        endsAt: now + c.endsInDays * DAY,
      });
      for (const u of c.updates || []) {
        insertUpdate.run(`${c.id}-${u.id}`, c.id, u.title, u.body, now - u.daysAgo * DAY);
      }
      for (const m of c.comments || []) {
        insertComment.run(`${c.id}-${m.id}`, c.id, m.userName, m.isOwner ? 1 : 0, m.body, now - m.daysAgo * DAY);
      }
    }
  })();
}

function openDb(file = process.env.JOGAAR_DB || path.join(__dirname, "data", "jogaar.db")) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  // Add the sample campaigns once, the first time the database is created.
  if (!db.prepare("SELECT 1 FROM meta WHERE key = 'seeded'").get()) {
    seed(db);
    db.prepare("INSERT INTO meta (key, value) VALUES ('seeded', ?)").run(String(Date.now()));
  }
  return db;
}

module.exports = { openDb };
