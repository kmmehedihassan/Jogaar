import React, { useEffect, useState } from "react";
import { Link, useHistory, useLocation, useParams } from "react-router-dom";
import {
  HiLocationMarker,
  HiTag,
  HiCheckCircle,
  HiArrowLeft,
  HiPencil,
  HiTrash,
  HiSpeakerphone,
  HiGift,
  HiFlag,
  HiBadgeCheck,
  HiEyeOff,
} from "react-icons/hi";
import ReportDialog from "../components/ReportDialog";
import ProgressBar from "../components/ProgressBar";
import { SaveButton, ShareButton } from "../components/CampaignActions";
import { Alert, Field, Spinner, useDocumentTitle } from "../components/common";
import { addComment, deleteCampaign, deleteComment, getCampaign, pledge, postUpdate } from "../api/client";
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
const METHOD_BN = { bKash: "বিকাশ", Nagad: "নগদ", Card: "কার্ড" };

const remaining = (r) => (r.limit ? Math.max(0, r.limit - (r.claimed || 0)) : null);

/** Rewards as a radio list (when choosing) or a plain list (read-only). */
function RewardList({ rewards, selectedId, onSelect }) {
  const { t } = useUi();
  if (!rewards || !rewards.length) return null;
  const selectable = Boolean(onSelect);
  const Row = selectable ? "label" : "div";

  return (
    <div className="reward-list" role={selectable ? "radiogroup" : undefined} aria-label={t("rewards.choose")}>
      <p className="reward-list__title">
        <HiGift aria-hidden="true" /> {selectable ? t("rewards.choose") : t("rewards.heading")}
      </p>
      {selectable && (
        <label className={`reward ${!selectedId ? "is-selected" : ""}`}>
          <input type="radio" name="reward" checked={!selectedId} onChange={() => onSelect(null)} className="sr-only" />
          <span className="reward__top">
            <strong>{t("rewards.none")}</strong>
          </span>
          <span className="reward__desc">{t("rewards.noneText")}</span>
        </label>
      )}
      {rewards.map((r) => {
        const left = remaining(r);
        const soldOut = left === 0;
        return (
          <Row
            key={r.id}
            className={`reward ${selectedId === r.id ? "is-selected" : ""} ${soldOut ? "is-disabled" : ""}`}
          >
            {selectable && (
              <input
                type="radio"
                name="reward"
                className="sr-only"
                checked={selectedId === r.id}
                disabled={soldOut}
                onChange={() => onSelect(r)}
              />
            )}
            <span className="reward__top">
              <strong>{r.title}</strong>
              <span className="reward__amount">{t("rewards.orMore", { amount: formatTaka(r.amount) })}</span>
            </span>
            {r.description && <span className="reward__desc">{r.description}</span>}
            <span className="reward__meta">
              {soldOut ? (
                <span className="reward__soldout">{t("rewards.soldOut")}</span>
              ) : left !== null ? (
                t("rewards.left", { n: formatNumber(left), limit: formatNumber(r.limit) })
              ) : null}
              {r.claimed > 0 && <span>{t("rewards.claimedBy", { n: formatNumber(r.claimed) })}</span>}
            </span>
          </Row>
        );
      })}
    </div>
  );
}

function PledgeForm({ campaign, onPledged }) {
  const { user, token } = useAuth();
  const { toast, t, tErr, lang } = useUi();
  const location = useLocation();
  const [amount, setAmount] = useState("1000");
  const [reward, setReward] = useState(null);
  const [method, setMethod] = useState("bKash");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  if (!user) {
    return (
      <>
        <div className="pledge-login">
          <p>{t("pledge.loginPrompt")}</p>
          <Link to={{ pathname: "/login", state: { from: location } }} className="btn btn--primary btn--block">
            {t("pledge.loginBtn")}
          </Link>
          <p className="small muted">
            {t("pledge.newHere")}{" "}
            <Link to={{ pathname: "/register", state: { from: location } }}>{t("pledge.createAccount")}</Link>
          </p>
        </div>
        <RewardList rewards={campaign.rewards} />
      </>
    );
  }

  if (campaign.ownerId === user.id) {
    return (
      <>
        <Alert type="info">{t("pledge.yours")}</Alert>
        <RewardList rewards={campaign.rewards} />
      </>
    );
  }

  if (done) {
    return (
      <div className="pledge-done">
        <HiCheckCircle size={40} />
        <h3>{t("pledge.thanks", { name: user.name.split(" ")[0] })}</h3>
        <p>{t("pledge.contributed", { amount: formatTaka(done.amount), title: campaign.title })}</p>
        {done.rewardTitle && <p className="pledge-done__reward">{t("pledge.withReward", { title: done.rewardTitle })}</p>}
        <div className="pledge-done__actions">
          <ShareButton title={campaign.title} />
          <button className="btn btn--outline btn--sm" onClick={() => setDone(null)}>
            {t("pledge.again")}
          </button>
        </div>
      </div>
    );
  }

  const value = Number(amount) || 0;
  const left = Math.max(0, campaign.goal - campaign.raised);

  const chooseReward = (r) => {
    setReward(r);
    setError("");
    if (r && value < r.amount) setAmount(String(r.amount));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!Number.isFinite(value) || value < 100) return setError(t("pledge.min"));
    if (value > 1000000) return setError(t("pledge.max"));
    if (reward && value < reward.amount) return setError(t("pledge.belowReward"));
    setBusy(true);
    try {
      const result = await pledge(token, campaign.id, {
        amount: value,
        method,
        message,
        anonymous,
        rewardId: reward ? reward.id : null,
      });
      setDone(result.pledge);
      setMessage("");
      setReward(null);
      onPledged(result);
      toast(t("toast.backed", { title: campaign.title, amount: formatTaka(value) }));
    } catch (err) {
      setError(tErr(err.message));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <form className="pledge-form" onSubmit={submit} noValidate>
      <RewardList rewards={campaign.rewards} selectedId={reward && reward.id} onSelect={chooseReward} />
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
        label={t("pledge.amount")}
        name="amount"
        type="number"
        min={reward ? reward.amount : 100}
        step="50"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        hint={left > 0 && value >= left ? t("pledge.fullyFunds") : undefined}
      />
      <Field label={t("pledge.method")} name="method" as="select" value={method} onChange={(e) => setMethod(e.target.value)}>
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {lang === "bn" ? METHOD_BN[m] : m}
          </option>
        ))}
      </Field>
      <Field
        label={t("pledge.message")}
        name="message"
        as="textarea"
        rows={2}
        maxLength={280}
        placeholder={t("pledge.messagePh")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <label className="checkbox">
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
        {t("pledge.anonymous")}
      </label>
      <Alert>{error}</Alert>
      <button className="btn btn--primary btn--block btn--lg" disabled={busy}>
        {busy ? t("pledge.processing") : t("pledge.backWith", { amount: formatTaka(value) })}
      </button>
      <p className="small muted text-center">{t("pledge.demo")}</p>
    </form>
  );
}

function UpdateForm({ campaign, onPosted }) {
  const { token } = useAuth();
  const { toast, t, tErr } = useUi();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button className="btn btn--outline btn--sm" onClick={() => setOpen(true)}>
        <HiSpeakerphone /> {t("update.post")}
      </button>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 10) {
      setError(t("update.invalid"));
      return;
    }
    setBusy(true);
    try {
      onPosted(await postUpdate(token, campaign.id, { title, body }));
      toast(t("toast.updatePosted"));
      setTitle("");
      setBody("");
      setError("");
      setOpen(false);
    } catch (err) {
      setError(tErr(err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card update-form" onSubmit={submit} noValidate>
      <Field label={t("update.title")} name="update-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      <Field label={t("update.body")} name="update-body" as="textarea" rows={4} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />
      <Alert>{error}</Alert>
      <div className="row-actions">
        <button type="button" className="btn btn--outline btn--sm" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </button>
        <button className="btn btn--primary btn--sm" disabled={busy}>
          {busy ? t("update.posting") : t("update.submit")}
        </button>
      </div>
    </form>
  );
}

function Comments({ campaign, comments, setComments, onReport }) {
  const { user, token } = useAuth();
  const { toast, t, tErr } = useUi();
  const location = useLocation();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (body.trim().length < 2) return setError(tErr("Write a comment first."));
    setBusy(true);
    setError("");
    try {
      const c = await addComment(token, campaign.id, body);
      setComments((list) => [c, ...list]);
      setBody("");
      toast(t("toast.commentPosted"));
    } catch (err) {
      setError(tErr(err.message));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const remove = async (c) => {
    if (!window.confirm(t("comments.confirmDelete"))) return;
    try {
      await deleteComment(token, c.id);
      setComments((list) => list.filter((x) => x.id !== c.id));
      toast(t("toast.commentDeleted"), "info");
    } catch (err) {
      toast(tErr(err.message), "error");
    }
  };

  const canDelete = (c) => user && (c.userId === user.id || campaign.ownerId === user.id) && c.userId !== null;

  return (
    <section>
      {user ? (
        <form className="comment-form" onSubmit={submit} noValidate>
          <span className="avatar">{initials(user.name)}</span>
          <div className="comment-form__body">
            <label htmlFor="field-comment" className="sr-only">
              {t("comments.label")}
            </label>
            <textarea
              id="field-comment"
              className="input"
              rows={3}
              maxLength={1000}
              placeholder={t("comments.placeholder")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Alert>{error}</Alert>
            <div className="row-actions">
              <button className="btn btn--primary btn--sm" disabled={busy || !body.trim()}>
                {busy ? t("comments.posting") : t("comments.submit")}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="comment-login">
          <Link to={{ pathname: "/login", state: { from: location } }}>{t("comments.login")}</Link>
        </p>
      )}

      {comments.length ? (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id}>
              <span className="avatar">{initials(c.userName)}</span>
              <div className="comment">
                <div className="comment__head">
                  <strong>{c.userName}</strong>
                  {c.isOwner && <span className="badge-creator">{t("comments.creator")}</span>}
                  <span className="muted small">{formatDate(c.createdAt)}</span>
                  {user && c.userId !== user.id && (
                    <button className="icon-link icon-link--flag" onClick={() => onReport("comment", c.id)} aria-label={t("comments.report")} title={t("comments.report")}>
                      <HiFlag />
                    </button>
                  )}
                  {canDelete(c) && (
                    <button className="icon-link" onClick={() => remove(c)} aria-label={t("comments.delete")} title={t("comments.delete")}>
                      <HiTrash />
                    </button>
                  )}
                </div>
                <p>{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t("comments.empty")}</p>
      )}
    </section>
  );
}

export default function CampaignDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const { toast, t, tErr } = useUi();
  const history = useHistory();
  const [data, setData] = useState(undefined);
  const [tab, setTab] = useState("story");
  const [reporting, setReporting] = useState(null);
  useDocumentTitle(data && data.campaign ? data.campaign.title : t("detail.back"));

  useEffect(() => {
    let alive = true;
    setData(undefined);
    setTab("story");
    getCampaign(id, token)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [id, token]);

  if (data === undefined) return <div className="page"><Spinner /></div>;
  if (data === null) return <NotFound />;

  const { campaign, pledges, comments } = data;
  const pct = percentFunded(campaign);
  const ended = isEnded(campaign);
  const days = daysLeft(campaign);
  const isOwner = Boolean(user && campaign.ownerId === user.id);
  const updates = campaign.updates || [];

  const onPledged = ({ campaign: updated, pledge: p }) =>
    setData((d) => ({ ...d, campaign: updated, pledges: [p, ...d.pledges] }));
  const onPosted = (updated) => {
    setData((d) => ({ ...d, campaign: updated }));
    setTab("updates");
  };
  const setComments = (fn) => setData((d) => ({ ...d, comments: fn(d.comments) }));
  const onDelete = async () => {
    if (!window.confirm(t("detail.confirmDelete", { title: campaign.title }))) return;
    try {
      await deleteCampaign(token, campaign.id);
      toast(t("toast.deleted"), "info");
      history.push("/dashboard?tab=campaigns");
    } catch (err) {
      toast(tErr(err.message), "error");
    }
  };

  const TABS = [
    { id: "story", label: t("detail.tabStory") },
    { id: "updates", label: t("detail.tabUpdates"), count: updates.length },
    { id: "comments", label: t("detail.tabComments"), count: comments.length },
    { id: "backers", label: t("detail.tabBackers"), count: pledges.length },
  ];

  return (
    <div className="page container">
      <Link to="/discover" className="back-link">
        <HiArrowLeft /> {t("detail.back")}
      </Link>

      <header className="detail__head">
        <div className="detail__titlebar">
          <h1>{campaign.title}</h1>
          {campaign.verified && (
            <span className="badge-verified">
              <HiBadgeCheck /> {t("card.verified")}
            </span>
          )}
          {pct >= 100 && <span className="badge-funded badge-funded--inline">{t("card.badgeFunded")}</span>}
        </div>
        {campaign.hidden && (
          <Alert type="info">
            <HiEyeOff aria-hidden="true" /> {t("detail.hiddenNotice")}
          </Alert>
        )}
        <p className="lead muted">{campaign.summary}</p>
        <div className="meta-row">
          <span>
            <HiTag /> {t(`category.${campaign.category}`)}
          </span>
          <span>
            <HiLocationMarker /> {campaign.location}
          </span>
          <span className="owner">
            <span className="avatar avatar--sm">{initials(campaign.ownerName)}</span>
            {t("detail.by", { name: campaign.ownerName })}
          </span>
        </div>
        <div className="detail__actions">
          <SaveButton campaignId={campaign.id} variant="button" />
          <ShareButton title={campaign.title} />
          {user && !isOwner && (
            <button className="btn btn--outline btn--sm" onClick={() => setReporting({ type: "campaign", id: campaign.id })}>
              <HiFlag /> {t("report.button")}
            </button>
          )}
          {isOwner && (
            <>
              <Link to={`/campaigns/${campaign.id}/edit`} className="btn btn--outline btn--sm">
                <HiPencil /> {t("detail.edit")}
              </Link>
              {campaign.raised === 0 && (
                <button className="btn btn--outline btn--sm btn--danger" onClick={onDelete}>
                  <HiTrash /> {t("detail.delete")}
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
            <p className="muted">{t("detail.raisedOf", { goal: formatTaka(campaign.goal) })}</p>
            <ProgressBar value={pct} large />
            <div className="fund-card__stats">
              <div>
                <strong>{formatNumber(pct)}%</strong>
                <span>{t("detail.funded")}</span>
              </div>
              <div>
                <strong>{formatNumber(campaign.backers)}</strong>
                <span>{t("detail.backers")}</span>
              </div>
              <div>
                <strong>{formatNumber(ended ? 0 : days)}</strong>
                <span>{days === 1 ? t("detail.dayLeft") : t("detail.daysLeft")}</span>
              </div>
            </div>
            {ended ? (
              <>
                <Alert type="info">{t("detail.endedOn", { date: formatDate(campaign.endsAt) })}</Alert>
                <RewardList rewards={campaign.rewards} />
              </>
            ) : (
              <PledgeForm campaign={campaign} onPledged={onPledged} />
            )}
          </div>
        </aside>

        <div className="detail__main">
          <div className="tabs" role="tablist">
            {TABS.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={tab === x.id}
                className={`tabs__btn ${tab === x.id ? "is-active" : ""}`}
                onClick={() => setTab(x.id)}
              >
                {x.label}
                {x.count > 0 && <span className="tabs__count">{formatNumber(x.count)}</span>}
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
                <p className="muted">{isOwner ? t("detail.noUpdatesOwner") : t("detail.noUpdates")}</p>
              )}
            </section>
          )}

          {tab === "comments" && (
            <Comments
              campaign={campaign}
              comments={comments}
              setComments={setComments}
              onReport={(type, targetId) => setReporting({ type, id: targetId })}
            />
          )}

          {tab === "backers" && (
            <section>
              {pledges.length ? (
                <ul className="backer-list">
                  {pledges.map((p) => {
                    const name = p.userName === "Anonymous" ? t("detail.anonymous") : p.userName;
                    return (
                      <li key={p.id}>
                        <span className="avatar">{initials(name)}</span>
                        <div>
                          <strong>{name}</strong> {t("detail.backed", { amount: formatTaka(p.amount) })}
                          <span className="muted small"> · {formatDate(p.createdAt)}</span>
                          {p.rewardTitle && <span className="reward-tag">{t("detail.rewardTag", { title: p.rewardTitle })}</span>}
                          {p.message && <p className="backer-msg">“{p.message}”</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted">{t("detail.firstBacker")}</p>
              )}
            </section>
          )}
        </div>
      </div>
      {reporting && <ReportDialog targetType={reporting.type} targetId={reporting.id} onClose={() => setReporting(null)} />}
    </div>
  );
}
