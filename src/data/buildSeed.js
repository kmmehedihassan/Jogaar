/**
 * Turns the relative-date sample data in campaigns.json into campaign,
 * update and comment records. Shared logic with server/seed.js — keep in sync.
 */
const DAY = 24 * 60 * 60 * 1000;

export function buildSeed(raw, now = Date.now()) {
  return raw.map(({ createdDaysAgo, endsInDays, updates = [], comments = [], rewards = [], ...c }) => ({
    ...c,
    rewards,
    createdAt: now - createdDaysAgo * DAY,
    endsAt: now + endsInDays * DAY,
    updates: updates.map(({ daysAgo, ...u }) => ({ ...u, createdAt: now - daysAgo * DAY })),
    seedComments: comments.map(({ daysAgo, ...m }) => ({
      ...m,
      id: `${c.id}-${m.id}`,
      campaignId: c.id,
      userId: null,
      isOwner: Boolean(m.isOwner),
      createdAt: now - daysAgo * DAY,
    })),
  }));
}
