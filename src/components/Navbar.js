import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useHistory, useLocation } from "react-router-dom";
import { HiMenu, HiX, HiChevronDown, HiMoon, HiSun } from "react-icons/hi";
import { useUi } from "../context/UiContext";
import { useAuth } from "../context/AuthContext";
import { initials } from "../utils/format";
import Logo from "./Logo";

const LINKS = [
  { to: "/discover", label: "Discover" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/stories", label: "Stories" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme, toast } = useUi();
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
    toast("You've been logged out.", "info");
    history.push("/");
  };

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="nav__brand" aria-label="Jogaar home">
          <Logo />
        </Link>

        <button
          className="nav__toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <HiX size={24} /> : <HiMenu size={24} />}
        </button>

        <nav className={`nav__menu ${open ? "is-open" : ""}`} aria-label="Main">
          <div className="nav__links">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className="nav__link" activeClassName="is-active">
                {l.label}
              </NavLink>
            ))}
          </div>

          <div className="nav__actions">
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            >
              {resolvedTheme === "dark" ? <HiSun size={20} /> : <HiMoon size={20} />}
            </button>
            <Link to="/start" className="btn btn--outline btn--sm">
              Start a campaign
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
                    <Link role="menuitem" to="/dashboard">Dashboard</Link>
                    <Link role="menuitem" to="/dashboard?tab=pledges">My contributions</Link>
                    <Link role="menuitem" to="/dashboard?tab=saved">Saved campaigns</Link>
                    <Link role="menuitem" to="/dashboard?tab=settings">Edit profile</Link>
                    <button role="menuitem" onClick={handleLogout}>Log out</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="nav__link">Log in</Link>
                <Link to="/register" className="btn btn--primary btn--sm">Sign up</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
