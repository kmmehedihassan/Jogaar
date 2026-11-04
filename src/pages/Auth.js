import React, { useState } from "react";
import { Link, Redirect, useHistory, useLocation } from "react-router-dom";
import { HiTranslate } from "react-icons/hi";
import { Alert, Field, useDocumentTitle } from "../components/common";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import { EMAIL_RE } from "../utils/format";
import hero from "../assets/images/story-nadia.jpg";
import Logo from "../components/Logo";

const PASSWORD_RE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

function validateRegister(v) {
  const e = {};
  if (v.name.trim().length < 2) e.name = "v.name";
  if (!v.email.trim()) e.email = "v.emailRequired";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "v.email";
  if (!v.password) e.password = "v.passwordRequired";
  else if (!PASSWORD_RE.test(v.password)) e.password = "v.password";
  if (v.confirm !== v.password) e.confirm = "v.confirm";
  if (v.contact.trim() && !/^\+?[0-9\s-]{7,15}$/.test(v.contact.trim())) e.contact = "v.phone";
  return e;
}

function validateLogin(v) {
  const e = {};
  if (!v.email.trim()) e.email = "v.emailRequired";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "v.email";
  if (!v.password) e.password = "v.passwordRequired";
  return e;
}

function AuthLayout({ title, subtitle, children }) {
  const { t, lang, setLang } = useUi();
  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="auth__box">
          <div className="auth__top">
            <Link to="/" className="auth__logo" aria-label={t("nav.home")}>
              <Logo />
            </Link>
            <button
              className="lang-btn"
              onClick={() => setLang(lang === "bn" ? "en" : "bn")}
              aria-label={t("nav.languageLabel")}
              lang={lang === "bn" ? "en" : "bn"}
            >
              <HiTranslate size={18} aria-hidden="true" />
              {t("nav.language")}
            </button>
          </div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </div>
      <div className="auth__art" aria-hidden="true">
        <img src={hero} alt="" />
        <blockquote>
          {t("auth.quote")}
          <cite>{t("auth.quoteBy")}</cite>
        </blockquote>
      </div>
    </div>
  );
}

/** Form state, validation (errors are translation keys) and submit handling. */
function useAuthForm(initial, validator, action) {
  const { t, tErr } = useUi();
  const history = useHistory();
  const location = useLocation();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const onChange = (e) => {
    const next = { ...values, [e.target.name]: e.target.value };
    setValues(next);
    setServerErrors((s) => ({ ...s, [e.target.name]: undefined }));
    if (touched[e.target.name]) setErrors(validator(next));
  };
  const onBlur = (e) => {
    setTouched((x) => ({ ...x, [e.target.name]: true }));
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
      if (err.field && err.field in values) setServerErrors({ [err.field]: tErr(err.message) });
      else setFormError(tErr(err.message));
      setBusy(false);
    }
  };
  const fieldProps = (name) => ({
    name,
    value: values[name],
    onChange,
    onBlur,
    error: serverErrors[name] || (touched[name] && errors[name] ? t(errors[name]) : undefined),
  });
  return { fieldProps, onSubmit, formError, busy, state: location.state };
}

export function Login() {
  const { user, login } = useAuth();
  const { toast, t } = useUi();
  useDocumentTitle(t("auth.login"));
  const { fieldProps, onSubmit, formError, busy, state } = useAuthForm(
    { email: "", password: "" },
    validateLogin,
    async (v) => {
      const u = await login(v);
      toast(t("toast.welcomeBack", { name: u.name.split(" ")[0] }));
    }
  );
  if (user) return <Redirect to="/dashboard" />;

  return (
    <AuthLayout title={t("auth.welcomeBack")} subtitle={t("auth.loginSub")}>
      <form onSubmit={onSubmit} noValidate>
        <Field label={t("auth.email")} type="email" autoComplete="email" {...fieldProps("email")} />
        <Field label={t("auth.password")} type="password" autoComplete="current-password" {...fieldProps("password")} />
        <Alert>{formError}</Alert>
        <button className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? t("auth.loggingIn") : t("auth.login")}
        </button>
      </form>
      <p className="auth__switch">
        {t("auth.newTo")} <Link to={{ pathname: "/register", state }}>{t("auth.createAccount")}</Link>
      </p>
    </AuthLayout>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const { toast, t } = useUi();
  useDocumentTitle(t("auth.registerTitle"));
  const { fieldProps, onSubmit, formError, busy, state } = useAuthForm(
    { name: "", email: "", password: "", confirm: "", contact: "" },
    validateRegister,
    async (v) => {
      const u = await register(v);
      toast(t("toast.welcome", { name: u.name.split(" ")[0] }));
    }
  );
  if (user) return <Redirect to="/dashboard" />;

  return (
    <AuthLayout title={t("auth.registerTitle")} subtitle={t("auth.registerSub")}>
      <form onSubmit={onSubmit} noValidate>
        <Field label={t("auth.fullName")} autoComplete="name" {...fieldProps("name")} />
        <Field label={t("auth.email")} type="email" autoComplete="email" {...fieldProps("email")} />
        <Field label={t("auth.phone")} type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" {...fieldProps("contact")} />
        <Field
          label={t("auth.password")}
          type="password"
          autoComplete="new-password"
          hint={t("auth.passwordHint")}
          {...fieldProps("password")}
        />
        <Field label={t("auth.confirm")} type="password" autoComplete="new-password" {...fieldProps("confirm")} />
        <Alert>{formError}</Alert>
        <button className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? t("auth.creating") : t("auth.create")}
        </button>
        <p className="small muted text-center">{t("auth.agree")}</p>
      </form>
      <p className="auth__switch">
        {t("auth.haveAccount")} <Link to={{ pathname: "/login", state }}>{t("auth.login")}</Link>
      </p>
    </AuthLayout>
  );
}
