import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HiBell, HiCash, HiChatAlt, HiSpeakerphone, HiBadgeCheck, HiEyeOff } from "react-icons/hi";
import { getNotifications, markNotificationsRead } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import { formatDate, formatNumber, formatTaka } from "../utils/format";

const ICONS = { pledge: HiCash, comment: HiChatAlt, update: HiSpeakerphone, verified: HiBadgeCheck, hidden: HiEyeOff };
const POLL_MS = 60000;

export default function NotificationBell() {
  const { token } = useAuth();
  const { t } = useUi();
  const location = useLocation();
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = useCallback(() => {
    if (!token) return;
    getNotifications(token)
      .then(setData)
      .catch(() => {});
  }, [token]);

  // Refresh on navigation and every minute.
  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load, location.pathname]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && data.unread > 0) {
      markNotificationsRead(token)
        .then(() => setData((d) => ({ ...d, unread: 0 })))
        .catch(() => {});
    }
  };

  const text = (n) =>
    t(`notif.${n.type}`, {
      name: n.actorName === "Anonymous" ? t("detail.anonymous") : n.actorName,
      campaign: n.campaignTitle,
      amount: formatTaka(n.amount),
    });

  return (
    <div className="bell" ref={ref}>
      <button
        className="icon-btn bell__btn"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={data.unread ? t("notif.open", { n: formatNumber(data.unread) }) : t("notif.title")}
        title={t("notif.title")}
      >
        <HiBell size={20} />
        {data.unread > 0 && <span className="bell__count">{formatNumber(Math.min(data.unread, 99))}</span>}
      </button>
      {open && (
        <div className="bell__panel">
          <div className="bell__head">{t("notif.title")}</div>
          {data.items.length ? (
            <ul>
              {data.items.map((n) => {
                const Icon = ICONS[n.type] || HiBell;
                return (
                  <li key={n.id} className={n.read ? "" : "is-unread"}>
                    <Link to={`/campaigns/${n.campaignId}`}>
                      <span className={`bell__icon bell__icon--${n.type}`}>
                        <Icon />
                      </span>
                      <span>
                        {text(n)}
                        <span className="muted small bell__date">{formatDate(n.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="bell__empty muted">{t("notif.empty")}</p>
          )}
        </div>
      )}
    </div>
  );
}
