import React from "react";
import { useHistory, useLocation } from "react-router-dom";
import { HiHeart, HiOutlineHeart, HiShare } from "react-icons/hi";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";

/** Heart button that saves a campaign to the user's list. */
export function SaveButton({ campaignId, variant = "icon" }) {
  const { user, savedIds, toggleSaved } = useAuth();
  const { toast, t, tErr } = useUi();
  const history = useHistory();
  const location = useLocation();
  const saved = savedIds.includes(campaignId);

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast(t("toast.loginToSave"), "info");
      history.push({ pathname: "/login", state: { from: location } });
      return;
    }
    try {
      const now = await toggleSaved(campaignId);
      toast(now ? t("toast.saved") : t("toast.unsaved"), now ? "success" : "info");
    } catch (err) {
      toast(tErr(err.message), "error");
    }
  };

  const label = saved ? t("card.unsave") : t("card.save");
  if (variant === "icon") {
    return (
      <button
        className={`save-btn ${saved ? "is-saved" : ""}`}
        onClick={onClick}
        aria-label={label}
        aria-pressed={saved}
        title={label}
      >
        {saved ? <HiHeart /> : <HiOutlineHeart />}
      </button>
    );
  }
  return (
    <button className={`btn btn--outline btn--sm ${saved ? "is-saved" : ""}`} onClick={onClick} aria-pressed={saved}>
      {saved ? <HiHeart /> : <HiOutlineHeart />}
      {saved ? t("card.savedBtn") : t("card.saveBtn")}
    </button>
  );
}

/** Uses the native share sheet when available, otherwise copies the link. */
export function ShareButton({ title }) {
  const { toast, t } = useUi();
  const onClick = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: t("card.shareText", { title }), url });
      } catch (_) {
        /* user cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast(t("toast.linkCopied"));
    } catch (_) {
      toast(t("toast.copyFailed"), "error");
    }
  };
  return (
    <button className="btn btn--outline btn--sm" onClick={onClick}>
      <HiShare /> {t("card.share")}
    </button>
  );
}
