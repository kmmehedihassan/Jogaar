import React, { useEffect, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { Alert, Field, Spinner, useDocumentTitle } from "../components/common";
import CampaignCard from "../components/CampaignCard";
import ProgressBar from "../components/ProgressBar";
import { changePassword, getDashboard, resetLocalData, USING_SERVER } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import {
  campaignImage,
  daysLeft,
  formatDate,
  formatNumber,
  formatTaka,
  initials,
  isEnded,
  percentFunded,
} from "../utils/format";

const TABS = [
  { id: "overview", key: "dash.tabOverview" },
  { id: "campaigns", key: "dash.tabCampaigns" },
  { id: "pledges", key: "dash.tabPledges" },
  { id: "saved", key: "dash.tabSaved" },
  { id: "settings", key: "dash.tabSettings" },
];
const METHOD_BN = { bKash: "বিকাশ", Nagad: "নগদ", Card: "কার্ড" };
const PASSWORD_RE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

function CampaignRow({ c }) {
  const { t } = useUi();
  const pct = percentFunded(c);
  return (
    <Link to={`/campaigns/${c.id}`} className="row-card">
      <img src={campaignImage(c)} alt="" />
      <div className="row-card__body">
        <strong>{c.title}</strong>
        <ProgressBar value={pct} />
        <span className="muted small">
          {formatTaka(c.raised)} / {formatTaka(c.goal)} · {t("card.funded", { pct: formatNumber(pct) })} ·{" "}
          {isEnded(c) ? t("card.ended") : t("dash.daysLeftN", { n: formatNumber(daysLeft(c)) })} ·{" "}
          {t("dash.backersN", { n: formatNumber(c.backers) })}
        </span>
      </div>
    </Link>
  );
}

function PledgeRow({ p }) {
  const { t, lang } = useUi();
  return (
    <div className="row-card">
      {p.campaign && <img src={campaignImage(p.campaign)} alt="" />}
      <div className="row-card__body">
        {p.campaign ? (
          <Link to={`/campaigns/${p.campaign.id}`}>
            <strong>{p.campaign.title}</strong>
          </Link>
        ) : (
          <strong>{t("dash.removed")}</strong>
        )}
        <span className="muted small">
          {formatDate(p.createdAt)} · {t("dash.via", { method: lang === "bn" ? METHOD_BN[p.method] || p.method : p.method })}
          {p.userName === "Anonymous" ? ` · ${t("dash.anonymous")}` : ""}
        </span>
        {p.rewardTitle && <span className="reward-tag">{t("detail.rewardTag", { title: p.rewardTitle })}</span>}
        {p.message && <span className="small">“{p.message}”</span>}
      </div>
      <strong className="row-card__amount">{formatTaka(p.amount)}</strong>
    </div>
  );
}

function PasswordForm() {
  const { token } = useAuth();
  const { toast, t, tErr } = useUi();
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const onChange = (e) => setV({ ...v, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!v.current) found.current = t("settings.vCurrent");
    if (!PASSWORD_RE.test(v.next)) found.next = t("v.password");
    else if (v.next === v.current) found.next = t("settings.vSame");
    if (v.confirm !== v.next) found.confirm = t("v.confirm");
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await changePassword(token, { current: v.current, next: v.next });
      setV({ current: "", next: "", confirm: "" });
      toast(t("toast.passwordChanged"));
    } catch (err) {
      setErrors(err.field && err.field in v ? { [err.field]: tErr(err.message) } : { form: tErr(err.message) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form-card" onSubmit={submit} noValidate>
      <h2 className="form-card__title">{t("settings.changePassword")}</h2>
      <Field label={t("settings.current")} name="current" type="password" autoComplete="current-password" value={v.current} onChange={onChange} error={errors.current} />
      <Field label={t("settings.new")} name="next" type="password" autoComplete="new-password" value={v.next} onChange={onChange} error={errors.next} />
      <Field label={t("settings.confirmNew")} name="confirm" type="password" autoComplete="new-password" value={v.confirm} onChange={onChange} error={errors.confirm} />
      <Alert>{errors.form}</Alert>
      <button className="btn btn--primary" disabled={busy}>
        {busy ? t("settings.saving") : t("settings.changePassword")}
      </button>
    </form>
  );
}

function DangerZone() {
  const { logout } = useAuth();
  const { t } = useUi();
  if (USING_SERVER) return null;
  const onReset = async () => {
    if (!window.confirm(t("settings.resetConfirm"))) return;
    await logout();
    resetLocalData();
    window.location.assign("/");
  };
  return (
    <div className="card form-card danger-zone">
      <h2 className="form-card__title">{t("settings.resetTitle")}</h2>
      <p className="muted">{t("settings.resetText")}</p>
      <button className="btn btn--outline btn--danger" onClick={onReset}>
        {t("settings.resetBtn")}
      </button>
    </div>
  );
}

function Settings() {
  const { user, updateProfile } = useAuth();
  const { toast, t, tErr } = useUi();
  const [values, setValues] = useState({ name: user.name, contact: user.contact, bio: user.bio });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setValues({ ...values, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (values.name.trim().length < 2) {
      setError(t("v.name"));
      return;
    }
    setBusy(true);
    try {
      await updateProfile(values);
      setError("");
      toast(t("toast.profileSaved"));
    } catch (err) {
      setError(tErr(err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form-card" onSubmit={submit} noValidate>
      <h2 className="form-card__title">{t("settings.profile")}</h2>
      <Field label={t("auth.email")} name="email" value={user.email} disabled hint={t("settings.emailHint")} />
      <Field label={t("settings.name")} name="name" value={values.name} onChange={onChange} />
      <Field label={t("settings.phone")} name="contact" type="tel" value={values.contact} onChange={onChange} />
      <Field label={t("settings.bio")} name="bio" as="textarea" rows={4} maxLength={300} value={values.bio} onChange={onChange} hint={t("settings.bioHint")} />
      <Alert>{error}</Alert>
      <button className="btn btn--primary" disabled={busy}>
        {busy ? t("settings.saving") : t("settings.save")}
      </button>
    </form>
  );
}

function Empty({ title, text, to, cta }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      <Link to={to} className="btn btn--primary">
        {cta}
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const { user, token, savedIds } = useAuth();
  const { t, tErr } = useUi();
  useDocumentTitle(t("nav.dashboard"));
  const location = useLocation();
  const history = useHistory();
  const tab = new URLSearchParams(location.search).get("tab") || "overview";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getDashboard(token)
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [token, tab, savedIds]);

  const setTab = (id) => history.replace({ search: id === "overview" ? "" : `?tab=${id}` });
  const totalGiven = data ? data.myPledges.reduce((s, p) => s + p.amount, 0) : 0;
  const totalRaised = data ? data.myCampaigns.reduce((s, c) => s + c.raised, 0) : 0;
  const supported = data ? new Set(data.myPledges.map((p) => p.campaignId)).size : 0;

  let content;
  if (error) content = <Alert>{tErr(error)}</Alert>;
  else if (!data) content = <Spinner />;
  else if (tab === "settings") {
    content = (
      <div className="settings-grid">
        <Settings />
        <div className="stack stack--lg">
          <PasswordForm />
          <DangerZone />
        </div>
      </div>
    );
  } else if (tab === "saved") {
    content = data.saved.length ? (
      <div className="grid grid--3">
        {data.saved.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
      </div>
    ) : (
      <Empty title={t("dash.emptySavedTitle")} text={t("dash.emptySavedText")} to="/discover" cta={t("home.discover")} />
    );
  } else if (tab === "campaigns") {
    content = data.myCampaigns.length ? (
      <div className="stack">
        {data.myCampaigns.map((c) => (
          <CampaignRow key={c.id} c={c} />
        ))}
      </div>
    ) : (
      <Empty title={t("dash.emptyCampaignsTitle")} text={t("dash.emptyCampaignsText")} to="/start" cta={t("nav.start")} />
    );
  } else if (tab === "pledges") {
    content = data.myPledges.length ? (
      <div className="stack">
        {data.myPledges.map((p) => (
          <PledgeRow key={p.id} p={p} />
        ))}
      </div>
    ) : (
      <Empty title={t("dash.emptyPledgesTitle")} text={t("dash.emptyPledgesText")} to="/discover" cta={t("home.discover")} />
    );
  } else {
    content = (
      <>
        <div className="kpis">
          <div className="card kpi">
            <span>{t("dash.kpiGiven")}</span>
            <strong>{formatTaka(totalGiven)}</strong>
          </div>
          <div className="card kpi">
            <span>{t("dash.kpiSupported")}</span>
            <strong>{formatNumber(supported)}</strong>
          </div>
          <div className="card kpi">
            <span>{t("dash.kpiSaved")}</span>
            <strong>{formatNumber(data.saved.length)}</strong>
          </div>
          <div className="card kpi">
            <span>{t("dash.kpiRaised")}</span>
            <strong>{formatTaka(totalRaised)}</strong>
          </div>
        </div>
        <div className="dash__cols">
          <section>
            <div className="section__head section__head--sm">
              <h2>{t("dash.yourCampaigns")}</h2>
              <button className="link-btn" onClick={() => setTab("campaigns")}>
                {t("dash.seeAll")}
              </button>
            </div>
            {data.myCampaigns.length ? (
              <div className="stack">
                {data.myCampaigns.slice(0, 3).map((c) => (
                  <CampaignRow key={c.id} c={c} />
                ))}
              </div>
            ) : (
              <p className="muted">
                {t("dash.noCampaignsShort")} <Link to="/start">{t("dash.startOne")}</Link>.
              </p>
            )}
          </section>
          <section>
            <div className="section__head section__head--sm">
              <h2>{t("dash.recent")}</h2>
              <button className="link-btn" onClick={() => setTab("pledges")}>
                {t("dash.seeAll")}
              </button>
            </div>
            {data.myPledges.length ? (
              <div className="stack">
                {data.myPledges.slice(0, 3).map((p) => (
                  <PledgeRow key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <p className="muted">
                {t("dash.noPledgesShort")} <Link to="/discover">{t("home.discover")}</Link>.
              </p>
            )}
          </section>
        </div>
      </>
    );
  }

  return (
    <div className="page container">
      <header className="dash__head">
        <span className="avatar avatar--lg">{initials(user.name)}</span>
        <div>
          <h1>{t("dash.hi", { name: user.name.split(" ")[0] })}</h1>
          <p className="muted">{t("dash.memberSince", { date: formatDate(user.createdAt) })}</p>
        </div>
        <Link to="/start" className="btn btn--primary dash__cta">
          {t("nav.start")}
        </Link>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            className={`tabs__btn ${tab === x.id ? "is-active" : ""}`}
            onClick={() => setTab(x.id)}
          >
            {t(x.key)}
          </button>
        ))}
      </div>

      {content}
    </div>
  );
}
