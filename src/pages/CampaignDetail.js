import React, { useEffect, useState } from "react";
import { Link, useHistory, useLocation, useParams } from "react-router-dom";
import { HiLocationMarker, HiTag, HiCheckCircle, HiArrowLeft, HiPencil, HiTrash, HiSpeakerphone } from "react-icons/hi";
import ProgressBar from "../components/ProgressBar";
import { SaveButton, ShareButton } from "../components/CampaignActions";
import { Alert, Field, Spinner, useDocumentTitle } from "../components/common";
import { deleteCampaign, getCampaign, pledge, postUpdate } from "../api/client";
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
import NotFound from "./NotFound";

const PRESETS = [500, 1000, 2500, 5000];
const METHODS = ["bKash", "Nagad", "Card"];

function PledgeForm({ campaign, onPledged }) {
  const { user } = useAuth();
  const { toast } = useUi();
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
        <div className="pledge-done__actions">
          <ShareButton title={campaign.title} />
          <button className="btn btn--outline btn--sm" onClick={() => setDone(null)}>
            Contribute again
          </button>
        </div>
      </div>
    );
  }

  const value = Number(amount) || 0;
  const remaining = Math.max(0, campaign.goal - campaign.raised);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
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
      toast(`You backed ${campaign.title} with ${formatTaka(value)}.`);
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
            className={`chip chip--link ${value === p ? "is-active" : ""}`}
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
        hint={remaining > 0 && value >= remaining ? "This contribution fully funds the campaign! 🎉" : undefined}
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
        {busy ? "Processing…" : `Back with ${formatTaka(value)}`}
      </button>
      <p className="small muted text-center">Demo checkout — no real money is charged.</p>
    </form>
  );
}

function UpdateForm({ campaign, onPosted }) {
  const { user } = useAuth();
  const { toast } = useUi();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button className="btn btn--outline btn--sm" onClick={() => setOpen(true)}>
        <HiSpeakerphone /> Post an update
      </button>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 10) {
      setError("Add a title and a few sentences for your backers.");
      return;
    }
    setBusy(true);
    try {
      onPosted(await postUpdate(user, campaign.id, { title, body }));
      toast("Update posted.");
      setTitle("");
      setBody("");
      setError("");
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card update-form" onSubmit={submit} noValidate>
      <Field label="Update title" name="update-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      <Field label="What's new?" name="update-body" as="textarea" rows={4} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />
      <Alert>{error}</Alert>
      <div className="row-actions">
        <button type="button" className="btn btn--outline btn--sm" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn btn--primary btn--sm" disabled={busy}>{busy ? "Posting…" : "Post update"}</button>
      </div>
    </form>
  );
}

export default function CampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useUi();
  const history = useHistory();
  const [data, setData] = useState(undefined);
  const [tab, setTab] = useState("story");
  useDocumentTitle(data && data.campaign ? data.campaign.title : "Campaign");

  useEffect(() => {
    let alive = true;
    setData(undefined);
    setTab("story");
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
  const isOwner = Boolean(user && campaign.ownerId === user.id);
  const updates = campaign.updates || [];

  const onPledged = ({ campaign: updated, pledge: p }) =>
    setData((d) => ({ campaign: updated, pledges: [p, ...d.pledges] }));
  const onPosted = (updated) => {
    setData((d) => ({ ...d, campaign: updated }));
    setTab("updates");
  };
  const onDelete = async () => {
    if (!window.confirm(`Delete “${campaign.title}”? This can't be undone.`)) return;
    try {
      await deleteCampaign(user, campaign.id);
      toast("Campaign deleted.", "info");
      history.push("/dashboard?tab=campaigns");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const TABS = [
    { id: "story", label: "Story" },
    { id: "updates", label: "Updates", count: updates.length },
    { id: "backers", label: "Backers", count: pledges.length },
  ];

  return (
    <div className="page container">
      <Link to="/discover" className="back-link">
        <HiArrowLeft /> All campaigns
      </Link>

      <header className="detail__head">
        <div className="detail__titlebar">
          <h1>{campaign.title}</h1>
          {pct >= 100 && <span className="badge-funded badge-funded--inline">Funded</span>}
        </div>
        <p className="lead muted">{campaign.summary}</p>
        <div className="meta-row">
          <span><HiTag /> {campaign.category}</span>
          <span><HiLocationMarker /> {campaign.location}</span>
          <span className="owner">
            <span className="avatar avatar--sm">{initials(campaign.ownerName)}</span>
            by {campaign.ownerName}
          </span>
        </div>
        <div className="detail__actions">
          <SaveButton campaignId={campaign.id} variant="button" />
          <ShareButton title={campaign.title} />
          {isOwner && (
            <>
              <Link to={`/campaigns/${campaign.id}/edit`} className="btn btn--outline btn--sm">
                <HiPencil /> Edit
              </Link>
              {campaign.raised === 0 && (
                <button className="btn btn--outline btn--sm btn--danger" onClick={onDelete}>
                  <HiTrash /> Delete
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <div className="detail">
        <img className="detail__img" src={campaignImage(campaign)} alt={campaign.title} />

        <aside className="detail__side">
          <div className="card fund-card">
            <div className="fund-card__raised">{formatTaka(campaign.raised)}</div>
            <p className="muted">raised of {formatTaka(campaign.goal)} goal</p>
            <ProgressBar value={pct} large />
            <div className="fund-card__stats">
              <div><strong>{pct}%</strong><span>funded</span></div>
              <div><strong>{formatNumber(campaign.backers)}</strong><span>backers</span></div>
              <div><strong>{ended ? 0 : days}</strong><span>{days === 1 ? "day left" : "days left"}</span></div>
            </div>
            {ended ? (
              <Alert type="info">This campaign ended on {formatDate(campaign.endsAt)}.</Alert>
            ) : (
              <PledgeForm campaign={campaign} onPledged={onPledged} />
            )}
          </div>
        </aside>

        <div className="detail__main">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`tabs__btn ${tab === t.id ? "is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.count > 0 && <span className="tabs__count">{t.count}</span>}
              </button>
            ))}
          </div>

          {tab === "story" && (
            <section className="prose">
              {campaign.story.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          )}

          {tab === "updates" && (
            <section>
              {isOwner && !ended && (
                <div className="update-compose">
                  <UpdateForm campaign={campaign} onPosted={onPosted} />
                </div>
              )}
              {updates.length ? (
                <ol className="timeline">
                  {updates.map((u) => (
                    <li key={u.id}>
                      <span className="muted small">{formatDate(u.createdAt)}</span>
                      <h3>{u.title}</h3>
                      <p>{u.body}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">No updates yet. {isOwner ? "Keep your backers in the loop by posting one." : "Check back soon."}</p>
              )}
            </section>
          )}

          {tab === "backers" && (
            <section>
              {pledges.length ? (
                <ul className="backer-list">
                  {pledges.map((p) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
