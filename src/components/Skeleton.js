import React from "react";
import { useUi } from "../context/UiContext";

export function CardSkeleton() {
  return (
    <div className="card campaign-card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton--media" />
      <div className="campaign-card__body">
        <div className="skeleton skeleton--line skeleton--w70" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line skeleton--w50" />
        <div className="skeleton skeleton--bar" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }) {
  const { t } = useUi();
  return (
    <div className="grid grid--3" role="status" aria-label={t("common.loading")}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
