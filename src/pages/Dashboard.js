import React, { useEffect, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { Alert, Field, Spinner, useDocumentTitle } from "../components/common";
import ProgressBar from "../components/ProgressBar";
import CampaignCard from "../components/CampaignCard";
import { changePassword, getDashboard, resetLocalData, USING_REMOTE_AUTH } from "../api/client";
import { useUi } from "../context/UiContext";
import { useAuth } from "../context/AuthContext";
import {
  campaignImage,
  daysLeft,
  formatDate,
  formatTaka,
  initials,
  isEnded,
  percentFunded,
} from "../utils/format";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "campaigns", label: "My campaigns" },
  { id: "pledges", label: "Contributions" },
  { id: "saved", label: "Saved" },
  { id: "settings", label: "Profile settings" },
];

function CampaignRow({ c }) {
  const pct = percentFunded(c);
  return (
    <Link to={`/campaigns/${c.id}`} className="row-card">
      <img src={campaignImage(c)} alt="" />
      <div className="row-card__body">
        <strong>{c.title}</strong>
        <ProgressBar value={pct} />
        <span className="muted small">
          {formatTaka(c.raised)} of {formatTaka(c.goal)} · {pct}% ·{" "}
          {isEnded(c) ? "Ended" : `${daysLeft(c)} days left`} · {c.backers} backers
        </span>
      </div>
    </Link>
  );
}

function PledgeRow({ p }) {
  return (
    <div className="row-card">
      {p.campaign && <img src={campaignImage(p.campaign)} alt="" />}
      <div className="row-card__body">
        {p.campaign ? (
          <Link to={`/campaigns/${p.campaign.id}`}><strong>{p.campaign.title}</strong></Link>
        ) : (
          <strong>Removed campaign</strong>
        )}
        <span className="muted small">
          {formatDate(p.createdAt)} · via {p.method}
          {p.userName === "Anonymous" ? " · anonymous" : ""}
        </span>
        {p.message && <span className="small">“{p.message}”</span>}
      </div>
      <strong className="row-card__amount">{formatTaka(p.amount)}</strong>
    </div>
  );
}

const PASSWORD_RE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

function PasswordForm() {
  const { token } = useAuth();
  const { toast } = useUi();
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const onChange = (e) => setV({ ...v, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!v.current) found.current = "Enter your current password.";
    if (!PASSWORD_RE.test(v.next))
      found.next = "Use at least 8 characters with an uppercase letter, a lowercase letter and a number.";
    else if (v.next === v.current) found.next = "Choose a password you haven't used here.";
    if (v.confirm !== v.next) found.confirm = "Passwords do not match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await changePassword(token, { current: v.current, next: v.next });
      setV({ current: "", next: "", confirm: "" });
      toast("Password changed.");
    } catch (err) {
      setErrors(err.field ? { [err.field]: err.message } : { form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form-card" onSubmit={submit} noValidate>
      <h2 className="form-card__title">Change password</h2>
      <Field label="Current password" name="current" type="password" autoComplete="current-password" value={v.current} onChange={onChange} error={errors.current} />
      <Field label="New password" name="next" type="password" autoComplete="new-password" value={v.next} onChange={onChange} error={errors.next} />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" value={v.confirm} onChange={onChange} error={errors.confirm} />
      <Alert>{errors.form}</Alert>
      <button className="btn btn--primary" disabled={busy || USING_REMOTE_AUTH}>
        {busy ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

function DangerZone() {
  const { logout } = useAuth();
  const onReset = async () => {
    if (!window.confirm("Delete all Jogaar data stored in this browser, including every account? This can't be undone.")) return;
    await logout();
    resetLocalData();
    window.location.assign("/");
  };
  if (USING_REMOTE_AUTH) return null;
  return (
    <div className="card form-card danger-zone">
      <h2 className="form-card__title">Reset demo data</h2>
      <p className="muted">
        In this demo, accounts, campaigns and contributions are stored only in this browser.
        Resetting restores the original sample campaigns.
      </p>
      <button className="btn btn--outline btn--danger" onClick={onReset}>Reset all local data</button>
    </div>
  );
}

function Settings() {
  const { user, updateProfile } = useAuth();
  const { toast } = useUi();
  const [values, setValues] = useState({ name: user.name, contact: user.contact, bio: user.bio });
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setValues({ ...values, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (values.name.trim().length < 2) {
      setStatus({ type: "error", msg: "Please enter your full name." });
      return;
    }
    setBusy(true);
    try {
      await updateProfile(values);
      setStatus({ type: "", msg: "" });
      toast("Profile saved.");
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form-card" onSubmit={submit} noValidate>
      <h2 className="form-card__title">Profile</h2>
      <Field label="Email" name="email" value={user.email} disabled hint="Email can't be changed." />
      <Field label="Full name" name="name" value={values.name} onChange={onChange} />
      <Field label="Phone" name="contact" type="tel" value={values.contact} onChange={onChange} />
      <Field label="About you" name="bio" as="textarea" rows={4} maxLength={300} value={values.bio} onChange={onChange} hint="Shown to backers on your campaigns." />
      <Alert type={status.type || "error"}>{status.msg}</Alert>
      <button className="btn btn--primary" disabled={busy || USING_REMOTE_AUTH}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { user } = useAuth();
  const location = useLocation();
  const history = useHistory();
  const tab = new URLSearchParams(location.search).get("tab") || "overview";
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    getDashboard(user).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [user, tab]);

  const setTab = (id) => history.replace({ search: id === "overview" ? "" : `?tab=${id}` });
  const totalGiven = data ? data.myPledges.reduce((s, p) => s + p.amount, 0) : 0;
  const totalRaised = data ? data.myCampaigns.reduce((s, c) => s + c.raised, 0) : 0;
  const supported = data ? new Set(data.myPledges.map((p) => p.campaignId)).size : 0;

  return (
    <div className="page container">
      <header className="dash__head">
        <span className="avatar avatar--lg">{initials(user.name)}</span>
        <div>
          <h1>Hi, {user.name.split(" ")[0]}</h1>
          <p className="muted">Member since {formatDate(user.createdAt)}</p>
        </div>
        <Link to="/start" className="btn btn--primary dash__cta">Start a campaign</Link>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tabs__btn ${tab === t.id ? "is-active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {!data ? (
        <Spinner />
      ) : tab === "settings" ? (
        <div className="settings-grid">
          <Settings />
          <div className="stack stack--lg">
            <PasswordForm />
            <DangerZone />
          </div>
        </div>
      ) : tab === "saved" ? (
        data.saved.length ? (
          <div className="grid grid--3">{data.saved.map((c) => <CampaignCard key={c.id} campaign={c} />)}</div>
        ) : (
          <div className="empty">
            <h3>No saved campaigns</h3>
            <p className="muted">Tap the heart on any campaign to keep track of it here.</p>
            <Link to="/discover" className="btn btn--primary">Discover campaigns</Link>
          </div>
        )
      ) : tab === "campaigns" ? (
        data.myCampaigns.length ? (
          <div className="stack">{data.myCampaigns.map((c) => <CampaignRow key={c.id} c={c} />)}</div>
        ) : (
          <div className="empty">
            <h3>You haven't started a campaign yet</h3>
            <p className="muted">It's free and takes about ten minutes.</p>
            <Link to="/start" className="btn btn--primary">Start a campaign</Link>
          </div>
        )
      ) : tab === "pledges" ? (
        data.myPledges.length ? (
          <div className="stack">{data.myPledges.map((p) => <PledgeRow key={p.id} p={p} />)}</div>
        ) : (
          <div className="empty">
            <h3>No contributions yet</h3>
            <p className="muted">Find a business you believe in.</p>
            <Link to="/discover" className="btn btn--primary">Discover campaigns</Link>
          </div>
        )
      ) : (
        <>
          <div className="kpis">
            <div className="card kpi"><span>Total contributed</span><strong>{formatTaka(totalGiven)}</strong></div>
            <div className="card kpi"><span>Businesses supported</span><strong>{supported}</strong></div>
            <div className="card kpi"><span>Saved campaigns</span><strong>{data.saved.length}</strong></div>
            <div className="card kpi"><span>Raised by your campaigns</span><strong>{formatTaka(totalRaised)}</strong></div>
          </div>
          <div className="dash__cols">
            <section>
              <div className="section__head section__head--sm">
                <h2>Your campaigns</h2>
                <button className="link-btn" onClick={() => setTab("campaigns")}>See all</button>
              </div>
              {data.myCampaigns.length ? (
                <div className="stack">{data.myCampaigns.slice(0, 3).map((c) => <CampaignRow key={c.id} c={c} />)}</div>
              ) : (
                <p className="muted">No campaigns yet. <Link to="/start">Start one</Link>.</p>
              )}
            </section>
            <section>
              <div className="section__head section__head--sm">
                <h2>Recent contributions</h2>
                <button className="link-btn" onClick={() => setTab("pledges")}>See all</button>
              </div>
              {data.myPledges.length ? (
                <div className="stack">{data.myPledges.slice(0, 3).map((p) => <PledgeRow key={p.id} p={p} />)}</div>
              ) : (
                <p className="muted">Nothing yet. <Link to="/discover">Discover campaigns</Link>.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
