import React from "react";
import { useUi } from "../context/UiContext";
import { formatNumber } from "../utils/format";

export default function ProgressBar({ value, large = false }) {
  const { t } = useUi();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`progress ${large ? "progress--lg" : ""}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t("card.funded", { pct: formatNumber(Math.round(value)) })}
    >
      <div className={`progress__fill ${value >= 100 ? "is-complete" : ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
