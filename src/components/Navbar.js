import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useHistory, useLocation } from "react-router-dom";
import { HiMenu, HiX, HiChevronDown, HiMoon, HiSun, HiTranslate } from "react-icons/hi";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import { initials } from "../utils/format";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";

const LINKS = [
  { to: "/discover", key: "nav.discover" },
  { to: "/how-it-works", key: "nav.how" },
  { to: "/stories", key: "nav.stories" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme, toast, t, lang, setLang } = useUi();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const history = useHistory();

  // Close menus whenever the route changes (but not on first mount).
  const lastPath = useRef(location.pathname);
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    setOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // Close the user menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    toast(t("toast.loggedOut"), "info");
    history.push("/");
  };

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="nav__brand" aria-label={t("nav.home")}>
          <Logo />
        </Link>

        <button
          className="nav__toggle"
          aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <HiX size={24} /> : <HiMenu size={24} />}
        </button>

        <nav className={`nav__menu ${open ? "is-open" : ""}`} aria-label="Main">
          <div className="nav__links">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className="nav__link" activeClassName="is-active">
                {t(l.key)}
              </NavLink>
            ))}
          </div>

          <div className="nav__actions">
            <button
              className="lang-btn"
              onClick={() => setLang(lang === "bn" ? "en" : "bn")}
              aria-label={t("nav.languageLabel")}
              title={t("nav.languageLabel")}
              lang={lang === "bn" ? "en" : "bn"}
            >
              <HiTranslate size={18} aria-hidden="true" />
              {t("nav.language")}
            </button>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={resolvedTheme === "dark" ? t("nav.toLight") : t("nav.toDark")}
              title={resolvedTheme === "dark" ? t("nav.toLight") : t("nav.toDark")}
            >
              {resolvedTheme === "dark" ? <HiSun size={20} /> : <HiMoon size={20} />}
            </button>
            {user && <NotificationBell />}
            <Link to="/start" className="btn btn--outline btn--sm">
              {t("nav.start")}
            </Link>
            {user ? (
              <div className="usermenu" ref={menuRef}>
                <button
                  className="usermenu__trigger"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((o) => !o)}
                >
                  <span className="avatar avatar--sm">{initials(user.name)}</span>
                  <span className="usermenu__name">{user.name.split(" ")[0]}</span>
                  <HiChevronDown />
                </button>
                {menuOpen && (
                  <div className="usermenu__panel" role="menu">
                    <div className="usermenu__head">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <Link role="menuitem" to="/dashboard">{t("nav.dashboard")}</Link>
                    {user.isAdmin && <Link role="menuitem" to="/admin">{t("nav.admin")}</Link>}
                    <Link role="menuitem" to="/dashboard?tab=pledges">{t("nav.myContributions")}</Link>
                    <Link role="menuitem" to="/dashboard?tab=saved">{t("nav.saved")}</Link>
                    <Link role="menuitem" to="/dashboard?tab=settings">{t("nav.editProfile")}</Link>
                    <button role="menuitem" onClick={handleLogout}>{t("nav.logout")}</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="nav__link">{t("nav.login")}</Link>
                <Link to="/register" className="btn btn--primary btn--sm">{t("nav.signup")}</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
