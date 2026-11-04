import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { HiLocationMarker, HiTag, HiCheckCircle, HiArrowLeft } from "react-icons/hi";
import ProgressBar from "../components/ProgressBar";
import { Alert, Field, Spinner, useDocumentTitle } from "../components/common";
import { getCampaign, pledge } from "../api/client";
import { useAuth } from "../context/AuthContext";
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
import NotFound from "./NotFound";

const PRESETS = [500, 1000, 2500, 5000];
const METHODS = ["bKash", "Nagad", "Card"];

function PledgeForm({ campaign, onPledged }) {
  const { user } = useAuth();
  const location = useLocation();
  const [amount, setAmount] = useState("1000");
  const [method, setMethod] = useState("bKash");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  if (!user) {
    return (
      <div className="pledge-login">
        <p>Log in to back this campaign.</p>
        <Link to={{ pathname: "/login", state: { from: location } }} className="btn btn--primary btn--block">
          Log in to contribute
        </Link>
        <p className="small muted">
          New here? <Link to={{ pathname: "/register", state: { from: location } }}>Create an account</Link>
        </p>
      </div>
    );
  }

  if (campaign.ownerId === user.id) {
    return <Alert type="info">This is your campaign. Share it to reach more backers!</Alert>;
  }

  if (done) {
    return (
      <div className="pledge-done">
        <HiCheckCircle size={40} />
        <h3>Thank you, {user.name.split(" ")[0]}!</h3>
        <p>You contributed {formatTaka(done.amount)} to {campaign.title}.</p>
        <button className="btn btn--outline btn--block" onClick={() => setDone(null)}>
          Contribute again
        </button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 100) {
      setError("The minimum contribution is ৳100.");
      return;
    }
    if (value > 1000000) {
      setError("The maximum single contribution is ৳10,00,000.");
      return;
    }
    setBusy(true);
    try {
      const result = await pledge(user, campaign.id, { amount: value, method, message, anonymous });
      setDone(result.pledge);
      setMessage("");
      onPledged(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="pledge-form" onSubmit={submit} noValidate>
      <div className="preset-row">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p}
            className={`chip chip--link ${Number(amount) === p ? "is-active" : ""}`}
            onClick={() => setAmount(String(p))}
          >
            {formatTaka(p)}
          </button>
        ))}
      </div>
      <Field
        label="Amount (৳)"
        name="amount"
        type="number"
        min="100"
        step="50"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Field label="Payment method" name="method" as="select" value={method} onChange={(e) => setMethod(e.target.value)}>
        {METHODS.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </Field>
      <Field
        label="Message (optional)"
        name="message"
        as="textarea"
        rows={2}
        maxLength={280}
        placeholder="Words of encouragement"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <label className="checkbox">
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
        Contribute anonymously
      </label>
      <Alert>{error}</Alert>
      <button className="btn btn--primary btn--block btn--lg" disabled={busy}>
        {busy ? "Processing…" : `Back with ${formatTaka(Number(amount) || 0)}`}
      </button>
      <p className="small muted text-center">Demo checkout — no real money is charged.</p>
    </form>
  );
}

export default function CampaignDetail() {
  const { id } = useParams();
  const [data, setData] = useState(undefined);
  useDocumentTitle(data && data.campaign ? data.campaign.title : "Campaign");

  useEffect(() => {
    let alive = true;
    setData(undefined);
    getCampaign(id).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [id]);

  if (data === undefined) return <div className="page"><Spinner /></div>;
  if (data === null) return <NotFound />;

  const { campaign, pledges } = data;
  const pct = percentFunded(campaign);
  const ended = isEnded(campaign);
  const days = daysLeft(campaign);

  const onPledged = ({ campaign: updated, pledge: p }) =>
    setData((d) => ({ campaign: updated, pledges: [p, ...d.pledges] }));

  return (
    <div className="page container">
      <Link to="/discover" className="back-link">
        <HiArrowLeft /> All campaigns
      </Link>

      <header className="detail__head">
        <h1>{campaign.title}</h1>
        <p className="lead muted">{campaign.summary}</p>
        <div className="meta-row">
          <span><HiTag /> {campaign.category}</span>
          <span><HiLocationMarker /> {campaign.location}</span>
          <span className="owner">
            <span className="avatar avatar--sm">{initials(campaign.ownerName)}</span>
            by {campaign.ownerName}
          </span>
        </div>
      </header>

      <div className="detail">
        <div className="detail__main">
          <img className="detail__img" src={campaignImage(campaign)} alt={campaign.title} />

          <section className="prose">
            <h2>About this campaign</h2>
            {campaign.story.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>

          <section>
            <h2>Recent backers</h2>
            {pledges.length ? (
              <ul className="backer-list">
                {pledges.slice(0, 10).map((p) => (
                  <li key={p.id}>
                    <span className="avatar">{initials(p.userName)}</span>
                    <div>
                      <strong>{p.userName}</strong> backed {formatTaka(p.amount)}
                      <span className="muted small"> · {formatDate(p.createdAt)}</span>
                      {p.message && <p className="backer-msg">“{p.message}”</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Be the first to back this campaign on Jogaar.</p>
            )}
          </section>
        </div>

        <aside className="detail__side">
          <div className="card fund-card">
            <div className="fund-card__raised">{formatTaka(campaign.raised)}</div>
            <p className="muted">raised of {formatTaka(campaign.goal)} goal</p>
            <ProgressBar value={pct} large />
            <div className="fund-card__stats">
              <div><strong>{pct}%</strong><span>funded</span></div>
              <div><strong>{formatNumber(campaign.backers)}</strong><span>backers</span></div>
              <div><strong>{ended ? 0 : days}</strong><span>days left</span></div>
            </div>
            {ended ? (
              <Alert type="info">This campaign ended on {formatDate(campaign.endsAt)}.</Alert>
            ) : (
              <PledgeForm campaign={campaign} onPledged={onPledged} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
