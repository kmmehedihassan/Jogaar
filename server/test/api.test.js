"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JOGAAR_DB = ":memory:";
const { openDb } = require("../db");
const { createApp } = require("../app");

let server;
let base;

test.before(async () => {
  const app = createApp(openDb(":memory:"), { adminEmails: ["admin@example.com"] });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(() => server.close());

async function call(path, { method = "GET", token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

let n = 0;
async function newUser(name = "Rahim Uddin") {
  n += 1;
  const { status, data } = await call("/auth/register", {
    method: "POST",
    body: { name, email: `user${n}@example.com`, password: "Secret123" },
  });
  assert.equal(status, 201);
  return { ...data, email: `user${n}@example.com` };
}

const campaignBody = {
  title: "Rahim's Tea Stall",
  category: "Food & Drink",
  location: "Mirpur, Dhaka",
  goal: 50000,
  durationDays: 30,
  summary: "A clean, friendly tea stall near the stadium.",
  story:
    "I have sold tea from a flask for five years. A proper stall with a stove and seating will let me serve more customers every day.",
  image: "cafe",
  rewards: [{ title: "Free tea for a month", amount: 500, limit: 2 }],
};

test("lists the sample campaigns with rewards and comments", async () => {
  const { status, data } = await call("/campaigns");
  assert.equal(status, 200);
  assert.equal(data.length, 6);
  const mishu = await call("/campaigns/mishu-pottery");
  assert.equal(mishu.data.campaign.rewards.length, 3);
  assert.equal(mishu.data.comments.length, 2);
  assert.equal((await call("/campaigns/nope")).status, 404);
});

test("register, login, me, wrong password and duplicate email", async () => {
  const u = await newUser();
  assert.equal(u.user.name, "Rahim Uddin");
  assert.equal(u.user.salt, undefined, "never leaks password data");

  const me = await call("/auth/me", { token: u.token });
  assert.equal(me.data.email, u.email);

  const dup = await call("/auth/register", {
    method: "POST",
    body: { name: "X Y", email: u.email, password: "Secret123" },
  });
  assert.equal(dup.status, 409);
  assert.equal(dup.data.field, "email");

  const bad = await call("/auth/login", { method: "POST", body: { email: u.email, password: "nope" } });
  assert.equal(bad.status, 401);
  const good = await call("/auth/login", { method: "POST", body: { email: u.email, password: "Secret123" } });
  assert.equal(good.status, 200);
  assert.ok(good.data.token);

  const weak = await call("/auth/register", {
    method: "POST",
    body: { name: "Weak Pass", email: "weak@example.com", password: "password" },
  });
  assert.equal(weak.status, 400);
  assert.equal(weak.data.field, "password");
});

test("requires a valid session", async () => {
  assert.equal((await call("/auth/me")).status, 401);
  assert.equal((await call("/auth/me", { token: "forged" })).status, 401);
  assert.equal((await call("/campaigns", { method: "POST", body: campaignBody })).status, 401);
});

test("logout ends the session and password change signs out other sessions", async () => {
  const u = await newUser();
  const second = await call("/auth/login", { method: "POST", body: { email: u.email, password: "Secret123" } });
  const changed = await call("/auth/password", {
    method: "POST",
    token: u.token,
    body: { current: "Secret123", next: "NewSecret456" },
  });
  assert.equal(changed.status, 204);
  assert.equal((await call("/auth/me", { token: second.data.token })).status, 401);
  assert.equal((await call("/auth/me", { token: u.token })).status, 200);

  await call("/auth/logout", { method: "POST", token: u.token });
  assert.equal((await call("/auth/me", { token: u.token })).status, 401);
});

test("full campaign lifecycle: create, edit, update, pledge with reward, comments, save, dashboard", async () => {
  const owner = await newUser("Owner Person");
  const backer = await newUser("Backer Person");

  const created = await call("/campaigns", { method: "POST", token: owner.token, body: campaignBody });
  assert.equal(created.status, 201);
  const c = created.data;
  assert.equal(c.ownerName, "Owner Person");
  assert.equal(c.story.length, 1);
  const rewardId = c.rewards[0].id;

  // Validation
  const invalid = await call("/campaigns", { method: "POST", token: owner.token, body: { ...campaignBody, goal: 5 } });
  assert.equal(invalid.data.field, "goal");
  const badImage = await call("/campaigns", {
    method: "POST",
    token: owner.token,
    body: { ...campaignBody, image: "javascript:alert(1)" },
  });
  assert.equal(badImage.data.field, "image");

  // Only the owner can edit or post updates
  assert.equal((await call(`/campaigns/${c.id}`, { method: "PATCH", token: backer.token, body: campaignBody })).status, 403);
  const edited = await call(`/campaigns/${c.id}`, {
    method: "PATCH",
    token: owner.token,
    body: { ...campaignBody, title: "Rahim's Tea Corner", rewards: c.rewards },
  });
  assert.equal(edited.data.title, "Rahim's Tea Corner");
  const posted = await call(`/campaigns/${c.id}/updates`, {
    method: "POST",
    token: owner.token,
    body: { title: "Stove arrived", body: "The new stove arrived today." },
  });
  assert.equal(posted.data.updates[0].title, "Stove arrived");

  // Pledges
  assert.equal(
    (await call(`/campaigns/${c.id}/pledges`, { method: "POST", token: owner.token, body: { amount: 500, method: "bKash" } }))
      .status,
    403,
    "owners can't back their own campaign"
  );
  const low = await call(`/campaigns/${c.id}/pledges`, {
    method: "POST",
    token: backer.token,
    body: { amount: 200, method: "bKash", rewardId },
  });
  assert.equal(low.status, 400);
  const p1 = await call(`/campaigns/${c.id}/pledges`, {
    method: "POST",
    token: backer.token,
    body: { amount: 500, method: "bKash", rewardId, message: "Good luck!" },
  });
  assert.equal(p1.status, 201);
  assert.equal(p1.data.campaign.raised, 500);
  assert.equal(p1.data.campaign.backers, 1);
  assert.equal(p1.data.campaign.rewards[0].claimed, 1);
  assert.equal(p1.data.pledge.rewardTitle, "Free tea for a month");

  const p2 = await call(`/campaigns/${c.id}/pledges`, {
    method: "POST",
    token: backer.token,
    body: { amount: 700, method: "Nagad", rewardId, anonymous: true },
  });
  assert.equal(p2.data.campaign.backers, 1, "repeat backer is counted once");
  assert.equal(p2.data.pledge.userName, "Anonymous");
  const soldOut = await call(`/campaigns/${c.id}/pledges`, {
    method: "POST",
    token: backer.token,
    body: { amount: 500, method: "Card", rewardId },
  });
  assert.equal(soldOut.status, 409);

  // Goal can't go below what's raised; funded campaigns can't be deleted
  const lowGoal = await call(`/campaigns/${c.id}`, {
    method: "PATCH",
    token: owner.token,
    body: { ...campaignBody, goal: 10000, rewards: [] },
  });
  assert.equal(lowGoal.status, 200);
  assert.equal(lowGoal.data.rewards.length, 1, "claimed rewards are kept");
  assert.equal((await call(`/campaigns/${c.id}`, { method: "DELETE", token: owner.token })).status, 409);

  // Comments
  const comment = await call(`/campaigns/${c.id}/comments`, {
    method: "POST",
    token: backer.token,
    body: { body: "Can't wait to visit!" },
  });
  assert.equal(comment.status, 201);
  const reply = await call(`/campaigns/${c.id}/comments`, {
    method: "POST",
    token: owner.token,
    body: { body: "Thank you!" },
  });
  assert.equal(reply.data.isOwner, true);
  const stranger = await newUser("Stranger Person");
  assert.equal((await call(`/comments/${comment.data.id}`, { method: "DELETE", token: stranger.token })).status, 403);
  assert.equal((await call(`/comments/${comment.data.id}`, { method: "DELETE", token: owner.token })).status, 204);
  const detail = await call(`/campaigns/${c.id}`);
  assert.equal(detail.data.comments.length, 1);
  assert.equal(detail.data.pledges.length, 2);
  assert.equal(detail.data.pledges[0].userId, undefined, "pledges don't expose user ids");

  // Saved + dashboard
  const saved = await call(`/me/saved/${c.id}`, { method: "POST", token: backer.token });
  assert.deepEqual(saved.data, [c.id]);
  const dash = await call("/me/dashboard", { token: backer.token });
  assert.equal(dash.data.myPledges.length, 2);
  assert.equal(dash.data.saved.length, 1);
  const unsaved = await call(`/me/saved/${c.id}`, { method: "POST", token: backer.token });
  assert.deepEqual(unsaved.data, []);
  const ownerDash = await call("/me/dashboard", { token: owner.token });
  assert.equal(ownerDash.data.myCampaigns[0].raised, 1200);
});

test("unfunded campaigns can be deleted by their owner", async () => {
  const owner = await newUser();
  const { data } = await call("/campaigns", { method: "POST", token: owner.token, body: campaignBody });
  assert.equal((await call(`/campaigns/${data.id}`, { method: "DELETE", token: owner.token })).status, 204);
  assert.equal((await call(`/campaigns/${data.id}`)).status, 404);
});

test("rate-limits repeated failed logins", async () => {
  const u = await newUser();
  let last;
  for (let i = 0; i < 11; i++) {
    last = await call("/auth/login", { method: "POST", body: { email: u.email, password: "wrong" } });
  }
  assert.equal(last.status, 429);
});

async function adminUser() {
  const reg = await call("/auth/register", {
    method: "POST",
    body: { name: "Admin Person", email: "admin@example.com", password: "Secret123" },
  });
  if (reg.status === 201) return reg.data;
  const login = await call("/auth/login", { method: "POST", body: { email: "admin@example.com", password: "Secret123" } });
  return login.data;
}

test("notifications: owners hear about pledges and comments, backers about updates", async () => {
  const owner = await newUser("Owner Person");
  const backer = await newUser("Backer Person");
  const { data: c } = await call("/campaigns", { method: "POST", token: owner.token, body: campaignBody });
  assert.equal(c.verified, false, "new campaigns start unverified");

  await call(`/campaigns/${c.id}/pledges`, { method: "POST", token: backer.token, body: { amount: 1000, method: "bKash" } });
  await call(`/campaigns/${c.id}/comments`, { method: "POST", token: backer.token, body: { body: "Nice!" } });
  await call(`/campaigns/${c.id}/comments`, { method: "POST", token: owner.token, body: { body: "Thanks" } });

  const ownerNotes = await call("/me/notifications", { token: owner.token });
  assert.equal(ownerNotes.data.unread, 2, "own comment doesn't notify the owner");
  assert.deepEqual(ownerNotes.data.items.map((n) => n.type).sort(), ["comment", "pledge"]);
  const pledgeNote = ownerNotes.data.items.find((n) => n.type === "pledge");
  assert.equal(pledgeNote.amount, 1000);
  assert.equal(pledgeNote.actorName, "Backer Person");

  await call(`/campaigns/${c.id}/updates`, {
    method: "POST",
    token: owner.token,
    body: { title: "Big news", body: "We opened the stall today!" },
  });
  const backerNotes = await call("/me/notifications", { token: backer.token });
  assert.equal(backerNotes.data.items[0].type, "update");
  assert.equal(backerNotes.data.items[0].campaignTitle, c.title);

  assert.equal((await call("/me/notifications/read", { method: "POST", token: owner.token })).status, 204);
  assert.equal((await call("/me/notifications", { token: owner.token })).data.unread, 0);
});

test("admins verify and hide campaigns; others can't", async () => {
  const admin = await adminUser();
  assert.equal(admin.user.isAdmin, true);
  const owner = await newUser("Owner Person");
  assert.equal(owner.user.isAdmin, false);
  const { data: c } = await call("/campaigns", { method: "POST", token: owner.token, body: campaignBody });

  assert.equal((await call("/admin/overview", { token: owner.token })).status, 403);
  assert.equal((await call(`/admin/campaigns/${c.id}`, { method: "PATCH", token: owner.token, body: { verified: true } })).status, 403);

  const verified = await call(`/admin/campaigns/${c.id}`, { method: "PATCH", token: admin.token, body: { verified: true } });
  assert.equal(verified.data.verified, true);
  const notes = await call("/me/notifications", { token: owner.token });
  assert.ok(notes.data.items.some((n) => n.type === "verified"));

  await call(`/admin/campaigns/${c.id}`, { method: "PATCH", token: admin.token, body: { hidden: true } });
  const list = await call("/campaigns");
  assert.ok(!list.data.some((x) => x.id === c.id), "hidden campaigns are not listed");
  assert.equal((await call(`/campaigns/${c.id}`)).status, 404, "hidden from the public");
  assert.equal((await call(`/campaigns/${c.id}`, { token: owner.token })).status, 200, "owner still sees it");
  assert.equal((await call(`/campaigns/${c.id}`, { token: admin.token })).status, 200, "admin still sees it");
  const backer = await newUser();
  assert.equal(
    (await call(`/campaigns/${c.id}/pledges`, { method: "POST", token: backer.token, body: { amount: 500, method: "bKash" } })).status,
    404
  );
  const overview = await call("/admin/overview", { token: admin.token });
  assert.ok(overview.data.campaigns.some((x) => x.id === c.id && x.hidden));
  assert.ok(overview.data.stats.users >= 3);
});

test("reports: users report, admins remove or dismiss", async () => {
  const admin = await adminUser();
  const owner = await newUser("Owner Person");
  const reporter = await newUser("Reporter Person");
  const { data: c } = await call("/campaigns", { method: "POST", token: owner.token, body: campaignBody });
  const { data: comment } = await call(`/campaigns/${c.id}/comments`, {
    method: "POST",
    token: owner.token,
    body: { body: "Buy cheap watches at spam.example" },
  });

  assert.equal((await call("/reports", { method: "POST", body: { targetType: "comment", targetId: comment.id, reason: "spam" } })).status, 401);
  const bad = await call("/reports", { method: "POST", token: reporter.token, body: { targetType: "comment", targetId: comment.id, reason: "meh" } });
  assert.equal(bad.status, 400);
  for (let i = 0; i < 2; i++) {
    const ok = await call("/reports", {
      method: "POST",
      token: reporter.token,
      body: { targetType: "comment", targetId: comment.id, reason: "spam" },
    });
    assert.equal(ok.status, 201);
  }
  await call("/reports", { method: "POST", token: reporter.token, body: { targetType: "campaign", targetId: c.id, reason: "fraud", details: "Looks fake" } });

  let overview = await call("/admin/overview", { token: admin.token });
  const mine = overview.data.reports.filter((r) => r.campaignId === c.id);
  assert.equal(mine.length, 2, "duplicate reports from the same person are merged");
  const commentReport = mine.find((r) => r.targetType === "comment");
  assert.equal(commentReport.commentBody, "Buy cheap watches at spam.example");
  assert.equal(commentReport.reporterName, "Reporter Person");

  assert.equal((await call(`/admin/reports/${commentReport.id}/resolve`, { method: "POST", token: reporter.token, body: { action: "remove" } })).status, 403);
  await call(`/admin/reports/${commentReport.id}/resolve`, { method: "POST", token: admin.token, body: { action: "remove" } });
  const detail = await call(`/campaigns/${c.id}`);
  assert.equal(detail.data.comments.length, 0, "removed comment is gone");

  const campaignReport = mine.find((r) => r.targetType === "campaign");
  await call(`/admin/reports/${campaignReport.id}/resolve`, { method: "POST", token: admin.token, body: { action: "dismiss" } });
  overview = await call("/admin/overview", { token: admin.token });
  assert.equal(overview.data.reports.filter((r) => r.campaignId === c.id).length, 0);
  assert.equal((await call(`/campaigns/${c.id}`)).status, 200, "dismissed report leaves the campaign visible");
});

test("admins can delete any comment", async () => {
  const admin = await adminUser();
  const u = await newUser();
  const { data: comment } = await call("/campaigns/retro-cafe/comments", { method: "POST", token: u.token, body: { body: "Hello there" } });
  assert.equal((await call(`/comments/${comment.id}`, { method: "DELETE", token: admin.token })).status, 204);
});
