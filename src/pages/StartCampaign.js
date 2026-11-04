import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { HiPhotograph } from "react-icons/hi";
import { Alert, Field, useDocumentTitle } from "../components/common";
import { createCampaign } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES, CATEGORY_IMAGES, IMAGES } from "../data/seed";
import { resizeImageFile } from "../utils/images";

const DURATIONS = [15, 30, 45, 60];
const MIN_GOAL = 10000;
const MAX_GOAL = 10000000;

function validate(v) {
  const e = {};
  if (v.title.trim().length < 5) e.title = "Give your campaign a title of at least 5 characters.";
  if (!v.category) e.category = "Choose a category.";
  if (!v.location.trim()) e.location = "Where is your business based?";
  const goal = Number(v.goal);
  if (!goal || goal < MIN_GOAL || goal > MAX_GOAL)
    e.goal = `Goal must be between ৳${MIN_GOAL.toLocaleString("en-IN")} and ৳${MAX_GOAL.toLocaleString("en-IN")}.`;
  if (v.summary.trim().length < 20) e.summary = "Write a short summary of at least 20 characters.";
  if (v.story.trim().length < 100)
    e.story = `Tell backers more — at least 100 characters (${v.story.trim().length}/100).`;
  return e;
}

export default function StartCampaign() {
  useDocumentTitle("Start a campaign");
  const { user } = useAuth();
  const history = useHistory();
  const [values, setValues] = useState({
    title: "",
    category: "",
    location: "",
    goal: "",
    durationDays: "30",
    summary: "",
    story: "",
  });
  const [cover, setCover] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const onChange = (e) => {
    const next = { ...values, [e.target.name]: e.target.value };
    setValues(next);
    if (touched[e.target.name]) setErrors(validate(next));
  };
  const onBlur = (e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
    setErrors(validate(values));
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
    const found = validate(values);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError("");
    try {
      const campaign = await createCampaign(user, {
        ...values,
        image: cover || CATEGORY_IMAGES[values.category],
      });
      history.push(`/campaigns/${campaign.id}`);
    } catch (ex) {
      setFormError(ex.message);
      setBusy(false);
    }
  };

  const previewSrc = cover || (values.category && IMAGES[CATEGORY_IMAGES[values.category]]);

  return (
    <div className="page container container--narrow">
      <header className="page__head">
        <span className="eyebrow">Start a campaign</span>
        <h1>Tell us about your business</h1>
        <p className="muted">Campaigns are free to start. You can share yours as soon as it's published.</p>
      </header>

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
          <Field label="Duration" name="durationDays" as="select" value={values.durationDays} onChange={onChange}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} days</option>)}
          </Field>
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
            {cover ? "Click the image to change it." : "Optional. Without one, we'll use a default image for your category."}
          </p>
        </div>

        <Alert>{formError}</Alert>
        <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
          {busy ? "Publishing…" : "Publish campaign"}
        </button>
      </form>
    </div>
  );
}
