import React, { useEffect, useState } from "react";
import { Link, Redirect, useHistory, useParams } from "react-router-dom";
import { HiPhotograph } from "react-icons/hi";
import { Alert, Field, Spinner, useDocumentTitle } from "../components/common";
import { createCampaign, getCampaign, updateCampaign } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import { CATEGORIES, CATEGORY_IMAGES, IMAGES } from "../data/seed";
import { campaignImage } from "../utils/format";
import { resizeImageFile } from "../utils/images";

const DURATIONS = [15, 30, 45, 60];
const MIN_GOAL = 10000;
const MAX_GOAL = 10000000;

const EMPTY = {
  title: "",
  category: "",
  location: "",
  goal: "",
  durationDays: "30",
  summary: "",
  story: "",
};

function validate(v, { minGoal = MIN_GOAL } = {}) {
  const e = {};
  if (v.title.trim().length < 5) e.title = "Give your campaign a title of at least 5 characters.";
  if (!v.category) e.category = "Choose a category.";
  if (!v.location.trim()) e.location = "Where is your business based?";
  const goal = Number(v.goal);
  const min = Math.max(MIN_GOAL, minGoal);
  if (!goal || goal < min || goal > MAX_GOAL)
    e.goal =
      min > MIN_GOAL
        ? `Goal must be at least ৳${min.toLocaleString("en-IN")} (already raised) and at most ৳${MAX_GOAL.toLocaleString("en-IN")}.`
        : `Goal must be between ৳${MIN_GOAL.toLocaleString("en-IN")} and ৳${MAX_GOAL.toLocaleString("en-IN")}.`;
  if (v.summary.trim().length < 20) e.summary = "Write a short summary of at least 20 characters.";
  if (v.story.trim().length < 100)
    e.story = `Tell backers more — at least 100 characters (${v.story.trim().length}/100).`;
  return e;
}

function CampaignForm({ initial, existing, onSubmit, submitLabel, busyLabel }) {
  const [values, setValues] = useState(initial);
  const [cover, setCover] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const rules = { minGoal: existing ? existing.raised : 0 };

  const onChange = (e) => {
    const next = { ...values, [e.target.name]: e.target.value };
    setValues(next);
    if (touched[e.target.name]) setErrors(validate(next, rules));
  };
  const onBlur = (e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
    setErrors(validate(values, rules));
  };
  const err = (name) => (touched[name] ? errors[name] : undefined);

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFormError("");
    try {
      setCover(await resizeImageFile(file));
    } catch (ex) {
      setFormError(ex.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(values, rules);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    if (Object.keys(found).length) {
      const first = document.querySelector(`[name="${Object.keys(found)[0]}"]`);
      if (first) first.focus();
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await onSubmit(values, cover);
    } catch (ex) {
      setFormError(ex.message);
      setBusy(false);
    }
  };

  const previewSrc =
    cover ||
    (existing ? campaignImage(existing) : values.category && IMAGES[CATEGORY_IMAGES[values.category]]);

  return (
    <form className="card form-card" onSubmit={submit} noValidate>
      <Field label="Campaign title" name="title" value={values.title} onChange={onChange} onBlur={onBlur} error={err("title")} maxLength={70} placeholder="e.g. Nadia's Home Bakery" />
      <div className="form-row">
        <Field label="Category" name="category" as="select" value={values.category} onChange={onChange} onBlur={onBlur} error={err("category")}>
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Field>
        <Field label="Location" name="location" value={values.location} onChange={onChange} onBlur={onBlur} error={err("location")} placeholder="e.g. Uttara, Dhaka" />
      </div>
      <div className="form-row">
        <Field label="Funding goal (৳)" name="goal" type="number" inputMode="numeric" min={MIN_GOAL} step="1000" value={values.goal} onChange={onChange} onBlur={onBlur} error={err("goal")} placeholder="150000" />
        {existing ? (
          <Field label="Deadline" name="deadline" value={new Date(existing.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} disabled hint="The deadline can't be changed once a campaign is live." />
        ) : (
          <Field label="Duration" name="durationDays" as="select" value={values.durationDays} onChange={onChange}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} days</option>)}
          </Field>
        )}
      </div>
      <Field label="Short summary" name="summary" value={values.summary} onChange={onChange} onBlur={onBlur} error={err("summary")} maxLength={140} hint={`${values.summary.length}/140 — shown on campaign cards`} />
      <Field label="Your story" name="story" as="textarea" rows={8} value={values.story} onChange={onChange} onBlur={onBlur} error={err("story")} hint="What are you building, why, and how will you use the money? Separate paragraphs with a blank line." />

      <div className="field">
        <span className="field__label">Cover image</span>
        <label className="upload">
          {previewSrc ? (
            <img src={previewSrc} alt="Cover preview" />
          ) : (
            <span className="upload__empty"><HiPhotograph size={32} />Choose a photo</span>
          )}
          <input type="file" accept="image/*" onChange={onFile} className="sr-only" />
        </label>
        <p className="field__hint">
          {cover || existing ? "Click the image to change it." : "Optional. Without one, we'll use a default image for your category."}
        </p>
      </div>

      <Alert>{formError}</Alert>
      <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}

export default function StartCampaign() {
  useDocumentTitle("Start a campaign");
  const { user } = useAuth();
  const { toast } = useUi();
  const history = useHistory();

  const onSubmit = async (values, cover) => {
    const campaign = await createCampaign(user, {
      ...values,
      image: cover || CATEGORY_IMAGES[values.category],
    });
    toast("Your campaign is live!");
    history.push(`/campaigns/${campaign.id}`);
  };

  return (
    <div className="page container container--narrow">
      <header className="page__head">
        <span className="eyebrow">Start a campaign</span>
        <h1>Tell us about your business</h1>
        <p className="muted">Campaigns are free to start. You can share yours as soon as it's published.</p>
      </header>
      <CampaignForm initial={EMPTY} onSubmit={onSubmit} submitLabel="Publish campaign" busyLabel="Publishing…" />
    </div>
  );
}

export function EditCampaign() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useUi();
  const history = useHistory();
  const [campaign, setCampaign] = useState(undefined);
  useDocumentTitle("Edit campaign");

  useEffect(() => {
    let alive = true;
    getCampaign(id).then((d) => alive && setCampaign(d ? d.campaign : null));
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

  const onSubmit = async (values, cover) => {
    await updateCampaign(user, id, { ...values, image: cover });
    toast("Campaign updated.");
    history.push(`/campaigns/${id}`);
  };

  return (
    <div className="page container container--narrow">
      <Link to={`/campaigns/${id}`} className="back-link">← Back to campaign</Link>
      <header className="page__head">
        <span className="eyebrow">Edit campaign</span>
        <h1>{campaign.title}</h1>
      </header>
      <CampaignForm initial={initial} existing={campaign} onSubmit={onSubmit} submitLabel="Save changes" busyLabel="Saving…" />
    </div>
  );
}
