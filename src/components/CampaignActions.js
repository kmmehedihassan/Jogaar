import React, { useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { HiHeart, HiOutlineHeart, HiShare } from "react-icons/hi";
import { getSavedIds, toggleSaved } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";

/** Heart button that saves a campaign to the user's list. */
export function SaveButton({ campaignId, variant = "icon", onChange }) {
  const { user } = useAuth();
  const { toast } = useUi();
  const history = useHistory();
  const location = useLocation();
  const [saved, setSaved] = useState(() => getSavedIds(user).includes(campaignId));

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast("Log in to save campaigns.", "info");
      history.push({ pathname: "/login", state: { from: location } });
      return;
    }
    const list = await toggleSaved(user, campaignId);
    const now = list.includes(campaignId);
    setSaved(now);
    toast(now ? "Saved to your list." : "Removed from your saved list.", now ? "success" : "info");
    if (onChange) onChange(now);
  };

  const label = saved ? "Remove from saved" : "Save campaign";
  if (variant === "icon") {
    return (
      <button className={`save-btn ${saved ? "is-saved" : ""}`} onClick={onClick} aria-label={label} aria-pressed={saved} title={label}>
        {saved ? <HiHeart /> : <HiOutlineHeart />}
      </button>
    );
  }
  return (
    <button className={`btn btn--outline btn--sm ${saved ? "is-saved" : ""}`} onClick={onClick} aria-pressed={saved}>
      {saved ? <HiHeart className="text-danger" /> : <HiOutlineHeart />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}

/** Uses the native share sheet when available, otherwise copies the link. */
export function ShareButton({ title }) {
  const { toast } = useUi();
  const onClick = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `Support ${title} on Jogaar`, url });
      } catch (_) {
        /* user cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied to clipboard.");
    } catch (_) {
      toast("Couldn't copy the link — copy it from the address bar.", "error");
    }
  };
  return (
    <button className="btn btn--outline btn--sm" onClick={onClick}>
      <HiShare /> Share
    </button>
  );
}
