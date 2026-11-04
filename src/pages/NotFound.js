import React from "react";
import { Link } from "react-router-dom";
import { useDocumentTitle } from "../components/common";
import { useUi } from "../context/UiContext";
import { formatNumber } from "../utils/format";

export default function NotFound() {
  const { t } = useUi();
  useDocumentTitle(t("notFound.title"));
  return (
    <div className="page container notfound">
      <span className="notfound__code">{formatNumber(404)}</span>
      <h1>{t("notFound.title")}</h1>
      <p className="muted">{t("notFound.text")}</p>
      <div className="hero__cta">
        <Link to="/" className="btn btn--primary">{t("notFound.home")}</Link>
        <Link to="/discover" className="btn btn--outline">{t("home.discover")}</Link>
      </div>
    </div>
  );
}
