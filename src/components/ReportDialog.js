import React, { useState } from "react";
import { report } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import { Alert, Field } from "./common";
import Modal from "./Modal";

const REASONS = ["spam", "fraud", "offensive", "other"];

/** Lets a signed-in user report a campaign or a comment. */
export default function ReportDialog({ targetType, targetId, onClose }) {
  const { token } = useAuth();
  const { t, tErr, toast } = useUi();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError(tErr("Choose a reason."));
      return;
    }
    setBusy(true);
    try {
      await report(token, { targetType, targetId, reason, details });
      toast(t("toast.reported"));
      onClose();
    } catch (err) {
      setError(tErr(err.message));
      setBusy(false);
    }
  };

  return (
    <Modal title={targetType === "comment" ? t("report.titleComment") : t("report.titleCampaign")} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p className="muted">{t("report.intro")}</p>
        <fieldset className="radio-list">
          <legend className="field__label">{t("report.reason")}</legend>
          {REASONS.map((r) => (
            <label key={r} className={`radio-option ${reason === r ? "is-selected" : ""}`}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              {t(`report.${r}`)}
            </label>
          ))}
        </fieldset>
        <Field
          label={t("report.details")}
          name="report-details"
          as="textarea"
          rows={3}
          maxLength={300}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <Alert>{error}</Alert>
        <div className="row-actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="btn btn--primary btn--sm" disabled={busy}>
            {busy ? t("report.sending") : t("report.submit")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
