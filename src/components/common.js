import React, { useEffect, useState } from "react";
import { Redirect, Route, useLocation } from "react-router-dom";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { useAuth } from "../context/AuthContext";

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Alert({ type = "error", children }) {
  if (!children) return null;
  return (
    <div className={`alert alert--${type}`} role={type === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

/** Labelled form input with inline error and optional password reveal. */
export function Field({ label, name, error, hint, type = "text", as = "input", children, ...props }) {
  const [reveal, setReveal] = useState(false);
  const id = `field-${name}`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const common = {
    id,
    name,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
    className: `input ${error ? "input--error" : ""}`,
    ...props,
  };

  let control;
  if (as === "textarea") control = <textarea {...common} />;
  else if (as === "select") control = <select {...common}>{children}</select>;
  else if (type === "password") {
    control = (
      <div className="input-group">
        <input {...common} type={reveal ? "text" : "password"} />
        <button
          type="button"
          className="input-group__btn"
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? "Hide password" : "Show password"}
        >
          {reveal ? <HiEyeOff /> : <HiEye />}
        </button>
      </div>
    );
  } else control = <input {...common} type={type} />;

  return (
    <div className="field">
      <label htmlFor={id} className="field__label">{label}</label>
      {control}
      {error ? (
        <p id={`${id}-error`} className="field__error">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field__hint">{hint}</p>
      ) : null}
    </div>
  );
}

/** Route that redirects to /login (remembering where the user was going). */
export function ProtectedRoute({ component: Component, ...rest }) {
  const { user, ready } = useAuth();
  return (
    <Route
      {...rest}
      render={(props) =>
        !ready ? (
          <Spinner />
        ) : user ? (
          <Component {...props} />
        ) : (
          <Redirect to={{ pathname: "/login", state: { from: props.location } }} />
        )
      }
    />
  );
}

/** Scrolls to the top on navigation, or to #hash targets when present. */
export function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Jogaar` : "Jogaar — Crowdfunding for small businesses";
  }, [title]);
}
