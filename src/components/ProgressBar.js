import React from "react";

export default function ProgressBar({ value, large = false }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`progress ${large ? "progress--lg" : ""}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${Math.round(value)}% funded`}
    >
      <div className={`progress__fill ${value >= 100 ? "is-complete" : ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
