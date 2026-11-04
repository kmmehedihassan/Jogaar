import React, { useEffect, useState } from "react";
import { Link, Redirect, useHistory, useParams } from "react-router-dom";
import { HiPhotograph, HiPlus, HiTrash, HiGift } from "react-icons/hi";
import { Alert, Field, Spinner, useDocumentTitle } from "../components/common";
import { createCampaign, getCampaign, updateCampaign } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import { CATEGORIES, CATEGORY_IMAGES, IMAGES } from "../data/seed";
import { campaignImage, formatDate, formatNumber, formatTaka } from "../utils/format";
import { resizeImageFile } from "../utils/images";

const DURATIONS = [15, 30, 45, 60];
const MIN_GOAL = 10000;
const MAX_GOAL = 10000000;
const MAX_REWARDS = 5;

const EMPTY = {
  title: "",
  category: "",
  location: "",
  goal: "",
  durationDays: "30",
  summary: "",
  story: "",
};

let nextKey = 1;
const blankReward = () => ({ key: `new-${nextKey++}`, title: "", amount: "", limit: "", description: "" });

/** Returns errors as [translationKey, vars] pairs. */
function validate(v, rewards, minGoal = 0) {
  const e = {};
  if (v.title.trim().length < 5) e.title = ["v.title"];
  if (!v.category) e.category = ["v.category"];
  if (!v.location.trim()) e.location = ["v.location"];
  const goal = Number(v.goal);
  const min = Math.max(MIN_GOAL, minGoal);
  if (!goal || goal < min || goal > MAX_GOAL) {
    e.goal = [min > MIN_GOAL ? "v.goalRaised" : "v.goal", { min: formatTaka(min), max: formatTaka(MAX_GOAL) }];
  }
  if (v.summary.trim().length < 20) e.summary = ["v.summary"];
  if (v.story.trim().length < 100) e.story = ["v.story", { n: formatNumber(v.story.trim().length) }];
  rewards.forEach((r) => {
    if (r.title.trim().length < 2) e[`reward-${r.key}-title`] = ["v.rewardTitle"];
    if (!(Number(r.amount) >= 100)) e[`reward-${r.key}-amount`] = ["v.rewardAmount"];
  });
  return e;
}

function RewardsEditor({ rewards, setRewards, errorFor, onBlur }) {
  const { t } = useUi();
  const change = (key, field, value) =>
    setRewards((list) => list.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  return (
    <fieldset className="rewards-editor">
      <legend className="field__label">
        <HiGift aria-hidden="true" /> {t("form.rewardsHeading")}
      </legend>
      <p className="field__hint">{t("form.rewardsHint")}</p>
      {rewards.map((r, i) => (
        <div key={r.key} className="reward-row">
          <div className="reward-row__head">
            <strong>
              {t("rewards.heading")} {formatNumber(i + 1)}
            </strong>
            {r.claimed > 0 ? (
              <span className="small muted">{t("form.rewardClaimed", { n: formatNumber(r.claimed) })}</span>
            ) : (
              <button
                type="button"
                className="link-btn link-btn--danger"
                onClick={() => setRewards((list) => list.filter((x) => x.key !== r.key))}
              >
                <HiTrash aria-hidden="true" /> {t("form.removeReward")}
              </button>
            )}
          </div>
          <div className="form-row">
            <Field
              label={t("form.rewardTitle")}
              id={`reward-${r.key}-title`}
              name={`reward-${r.key}-title`}
              value={r.title}
              maxLength={60}
              onChange={(e) => change(r.key, "title", e.target.value)}
              onBlur={onBlur}
              error={errorFor(`reward-${r.key}-title`)}
            />
            <Field
              label={t("form.rewardAmount")}
              id={`reward-${r.key}-amount`}
              name={`reward-${r.key}-amount`}
              type="number"
              inputMode="numeric"
              min="100"
              value={r.amount}
              onChange={(e) => change(r.key, "amount", e.target.value)}
              onBlur={onBlur}
              error={errorFor(`reward-${r.key}-amount`)}
            />
          </div>
          <div className="form-row">
            <Field
              label={t("form.rewardDescription")}
              id={`reward-${r.key}-description`}
              name={`reward-${r.key}-description`}
              value={r.description}
              maxLength={200}
              onChange={(e) => change(r.key, "description", e.target.value)}
            />
            <Field
              label={t("form.rewardLimit")}
              id={`reward-${r.key}-limit`}
              name={`reward-${r.key}-limit`}
              type="number"
              inputMode="numeric"
              min="1"
              placeholder={t("form.rewardLimitPh")}
              value={r.limit}
              onChange={(e) => change(r.key, "limit", e.target.value)}
            />
          </div>
        </div>
      ))}
      {rewards.length < MAX_REWARDS && (
        <button type="button" className="btn btn--outline btn--sm" onClick={() => setRewards((l) => [...l, blankReward()])}>
          <HiPlus aria-hidden="true" /> {t("form.addReward")}
        </button>
      )}
    </fieldset>
  );
}

function CampaignForm({ initial, initialRewards = [], existing, onSubmit, submitLabel, busyLabel }) {
  const { t, tErr } = useUi();
  const [values, setValues] = useState(initial);
  const [rewards, setRewards] = useState(initialRewards);
  const [cover, setCover] = useState(null);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const minGoal = existing ? existing.raised : 0;
  const errors = validate(values, rewards, minGoal);

  const onChange = (e) => setValues({ ...values, [e.target.name]: e.target.value });
  const onBlur = (e) => setTouched((x) => ({ ...x, [e.target.name]: true }));
  const errorFor = (name) => ((submitted || touched[name]) && errors[name] ? t(...errors[name]) : undefined);

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFormError("");
    try {
      setCover(await resizeImageFile(file));
    } catch (ex) {
      setFormError(tErr(ex.message));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    const keys = Object.keys(errors);
    if (keys.length) {
      const first = document.getElementById(keys[0].startsWith("reward-") ? keys[0] : `field-${keys[0]}`);
      if (first) first.focus();
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await onSubmit(
        values,
        rewards.map(({ key, claimed, ...r }) => ({
          ...r,
          id: key.startsWith("new-") ? undefined : key,
          amount: Number(r.amount),
          limit: r.limit ? Number(r.limit) : undefined,
        })),
        cover
      );
    } catch (ex) {
      setFormError(tErr(ex.message));
      setBusy(false);
    }
  };

  const previewSrc =
    cover || (existing ? campaignImage(existing) : values.category && IMAGES[CATEGORY_IMAGES[values.category]]);

  return (
    <form className="card form-card" onSubmit={submit} noValidate>
      <Field label={t("form.title")} name="title" value={values.title} onChange={onChange} onBlur={onBlur} error={errorFor("title")} maxLength={70} placeholder={t("form.titlePh")} />
      <div className="form-row">
        <Field label={t("form.category")} name="category" as="select" value={values.category} onChange={onChange} onBlur={onBlur} error={errorFor("category")}>
          <option value="">{t("form.selectCategory")}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`category.${c}`)}
            </option>
          ))}
        </Field>
        <Field label={t("form.location")} name="location" value={values.location} onChange={onChange} onBlur={onBlur} error={errorFor("location")} maxLength={80} placeholder={t("form.locationPh")} />
      </div>
      <div className="form-row">
        <Field label={t("form.goal")} name="goal" type="number" inputMode="numeric" min={MIN_GOAL} step="1000" value={values.goal} onChange={onChange} onBlur={onBlur} error={errorFor("goal")} placeholder="150000" />
        {existing ? (
          <Field label={t("form.deadline")} name="deadline" value={formatDate(existing.endsAt)} disabled hint={t("form.deadlineHint")} />
        ) : (
          <Field label={t("form.duration")} name="durationDays" as="select" value={values.durationDays} onChange={onChange}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {t("form.days", { n: formatNumber(d) })}
              </option>
            ))}
          </Field>
        )}
      </div>
      <Field label={t("form.summary")} name="summary" value={values.summary} onChange={onChange} onBlur={onBlur} error={errorFor("summary")} maxLength={140} hint={t("form.summaryHint", { n: formatNumber(values.summary.length) })} />
      <Field label={t("form.story")} name="story" as="textarea" rows={8} value={values.story} onChange={onChange} onBlur={onBlur} error={errorFor("story")} hint={t("form.storyHint")} />

      <div className="field">
        <span className="field__label">{t("form.cover")}</span>
        <label className="upload">
          {previewSrc ? (
            <img src={previewSrc} alt={t("form.coverPreview")} />
          ) : (
            <span className="upload__empty">
              <HiPhotograph size={32} />
              {t("form.choosePhoto")}
            </span>
          )}
          <input type="file" accept="image/*" onChange={onFile} className="sr-only" />
        </label>
        <p className="field__hint">{cover || existing ? t("form.coverChange") : t("form.coverOptional")}</p>
      </div>

      <RewardsEditor rewards={rewards} setRewards={setRewards} errorFor={errorFor} onBlur={onBlur} />

      <Alert>{formError}</Alert>
      <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}

export default function StartCampaign() {
  const { token } = useAuth();
  const { toast, t } = useUi();
  useDocumentTitle(t("nav.start"));
  const history = useHistory();

  const onSubmit = async (values, rewards, cover) => {
    const campaign = await createCampaign(token, {
      ...values,
      rewards,
      image: cover || CATEGORY_IMAGES[values.category],
    });
    toast(t("toast.live"));
    history.push(`/campaigns/${campaign.id}`);
  };

  return (
    <div className="page container container--narrow">
      <header className="page__head">
        <span className="eyebrow">{t("start.eyebrow")}</span>
        <h1>{t("start.title")}</h1>
        <p className="muted">{t("start.lead")}</p>
      </header>
      <CampaignForm initial={EMPTY} onSubmit={onSubmit} submitLabel={t("form.publish")} busyLabel={t("form.publishing")} />
    </div>
  );
}

export function EditCampaign() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const { toast, t } = useUi();
  useDocumentTitle(t("edit.eyebrow"));
  const history = useHistory();
  const [campaign, setCampaign] = useState(undefined);

  useEffect(() => {
    let alive = true;
    getCampaign(id)
      .then((d) => alive && setCampaign(d ? d.campaign : null))
      .catch(() => alive && setCampaign(null));
    return () => {
      alive = false;
    };
  }, [id]);

  if (campaign === undefined) return <div className="page"><Spinner /></div>;
  if (campaign === null || campaign.ownerId !== user.id) return <Redirect to={`/campaigns/${id}`} />;

  const initial = {
    title: campaign.title,
    category: campaign.category,
    location: campaign.location,
    goal: String(campaign.goal),
    durationDays: "30",
    summary: campaign.summary,
    story: campaign.story.join("\n\n"),
  };
  const initialRewards = (campaign.rewards || []).map((r) => ({
    key: r.id,
    title: r.title,
    amount: String(r.amount),
    limit: r.limit ? String(r.limit) : "",
    description: r.description || "",
    claimed: r.claimed || 0,
  }));

  const onSubmit = async (values, rewards, cover) => {
    await updateCampaign(token, id, { ...values, rewards, image: cover || undefined });
    toast(t("toast.campaignUpdated"));
    history.push(`/campaigns/${id}`);
  };

  return (
    <div className="page container container--narrow">
      <Link to={`/campaigns/${id}`} className="back-link">
        ← {t("edit.back")}
      </Link>
      <header className="page__head">
        <span className="eyebrow">{t("edit.eyebrow")}</span>
        <h1>{campaign.title}</h1>
      </header>
      <CampaignForm
        initial={initial}
        initialRewards={initialRewards}
        existing={campaign}
        onSubmit={onSubmit}
        submitLabel={t("form.save")}
        busyLabel={t("form.saving")}
      />
    </div>
  );
}
