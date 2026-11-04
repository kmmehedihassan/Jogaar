import React, { useState } from "react";
import { Link, Redirect, useHistory, useLocation } from "react-router-dom";
import { Alert, Field, useDocumentTitle } from "../components/common";
import { useAuth } from "../context/AuthContext";
import { EMAIL_RE } from "../utils/format";
import hero from "../assets/images/story-nadia.jpg";
import Logo from "../components/Logo";

const PASSWORD_RE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

function validateRegister(v) {
  const e = {};
  if (v.name.trim().length < 2) e.name = "Please enter your full name.";
  if (!v.email.trim()) e.email = "Email is required.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (!v.password) e.password = "Password is required.";
  else if (!PASSWORD_RE.test(v.password))
    e.password = "Use at least 8 characters with an uppercase letter, a lowercase letter and a number.";
  if (v.confirm !== v.password) e.confirm = "Passwords do not match.";
  if (v.contact.trim() && !/^\+?[0-9\s-]{7,15}$/.test(v.contact.trim()))
    e.contact = "Enter a valid phone number.";
  return e;
}

function validateLogin(v) {
  const e = {};
  if (!v.email.trim()) e.email = "Email is required.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (!v.password) e.password = "Password is required.";
  return e;
}

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="auth__box">
          <Link to="/" className="auth__logo"><Logo /></Link>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </div>
      <div className="auth__art" aria-hidden="true">
        <img src={hero} alt="" />
        <blockquote>
          “Jogaar turned my home kitchen into a real bakery.”
          <cite>— Nadia, Uttara</cite>
        </blockquote>
      </div>
    </div>
  );
}

function useAuthForm(initial, validator, action) {
  const history = useHistory();
  const location = useLocation();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const onChange = (e) => {
    const next = { ...values, [e.target.name]: e.target.value };
    setValues(next);
    if (touched[e.target.name]) setErrors(validator(next));
  };
  const onBlur = (e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
    setErrors(validator(values));
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validator(values);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError("");
    try {
      await action(values);
      const from = location.state && location.state.from;
      history.replace(from || "/dashboard");
    } catch (err) {
      if (err.field) setErrors((x) => ({ ...x, [err.field]: err.message }));
      else setFormError(err.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  };
  const fieldProps = (name) => ({
    name,
    value: values[name],
    onChange,
    onBlur,
    error: touched[name] ? errors[name] : undefined,
  });
  return { fieldProps, onSubmit, formError, busy, state: location.state };
}

export function Login() {
  useDocumentTitle("Log in");
  const { user, login } = useAuth();
  const { fieldProps, onSubmit, formError, busy, state } = useAuthForm(
    { email: "", password: "" },
    validateLogin,
    login
  );
  if (user) return <Redirect to="/dashboard" />;

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to back campaigns and manage your own.">
      <form onSubmit={onSubmit} noValidate>
        <Field label="Email" type="email" autoComplete="email" {...fieldProps("email")} />
        <Field label="Password" type="password" autoComplete="current-password" {...fieldProps("password")} />
        <Alert>{formError}</Alert>
        <button className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="auth__switch">
        New to Jogaar? <Link to={{ pathname: "/register", state }}>Create an account</Link>
      </p>
    </AuthLayout>
  );
}

export function Register() {
  useDocumentTitle("Create an account");
  const { user, register } = useAuth();
  const { fieldProps, onSubmit, formError, busy, state } = useAuthForm(
    { name: "", email: "", password: "", confirm: "", contact: "" },
    validateRegister,
    register
  );
  if (user) return <Redirect to="/dashboard" />;

  return (
    <AuthLayout title="Create your account" subtitle="Join thousands supporting local businesses.">
      <form onSubmit={onSubmit} noValidate>
        <Field label="Full name" autoComplete="name" {...fieldProps("name")} />
        <Field label="Email" type="email" autoComplete="email" {...fieldProps("email")} />
        <Field label="Phone (optional)" type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" {...fieldProps("contact")} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with upper and lowercase letters and a number."
          {...fieldProps("password")}
        />
        <Field label="Confirm password" type="password" autoComplete="new-password" {...fieldProps("confirm")} />
        <Alert>{formError}</Alert>
        <button className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
        <p className="small muted text-center">
          By signing up you agree to use Jogaar responsibly and honestly.
        </p>
      </form>
      <p className="auth__switch">
        Already have an account? <Link to={{ pathname: "/login", state }}>Log in</Link>
      </p>
    </AuthLayout>
  );
}
