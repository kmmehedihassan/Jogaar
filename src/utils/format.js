const DAY = 24 * 60 * 60 * 1000;

// Set by the language switcher (UiContext). "bn" shows Bangla digits and month names.
let locale = "en";
export function setLocale(lang) {
  locale = lang === "bn" ? "bn" : "en";
}
const numberLocale = () => (locale === "bn" ? "bn-BD" : "en-IN");

export function formatTaka(amount) {
  return `৳${Math.round(Number(amount) || 0).toLocaleString(numberLocale())}`;
}

export function formatNumber(n) {
  return (Number(n) || 0).toLocaleString(numberLocale());
}

export function percentFunded(campaign) {
  if (!campaign || !campaign.goal) return 0;
  return Math.round((campaign.raised / campaign.goal) * 100);
}

export function daysLeft(campaign, now = Date.now()) {
  return Math.max(0, Math.ceil((campaign.endsAt - now) / DAY));
}

export function isEnded(campaign, now = Date.now()) {
  return campaign.endsAt <= now;
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function initials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?"
  );
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export { campaignImage } from "./images";
