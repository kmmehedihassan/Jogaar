import React, { useCallback, useEffect, useState } from "react";
import { Link, Redirect } from "react-router-dom";
import { HiBadgeCheck, HiFlag, HiChatAlt, HiEye, HiEyeOff } from "react-icons/hi";
import { Alert, Spinner, useDocumentTitle } from "../components/common";
import { adminUpdateCampaign, getAdminOverview, resolveReport, USING_SERVER } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import { campaignImage, formatDate, formatNumber, formatTaka, percentFunded } from "../utils/format";

function ReportCard({ r, onResolve }) {
  const { t } = useUi();
  const isComment = r.targetType === "comment";
  return (
    <article className="card report-card">
      <div className="report-card__head">
        <span className={`report-type ${isComment ? "report-type--comment" : ""}`}>
          {isComment ? <HiChatAlt /> : <HiFlag />}
          {isComment ? t("admin.reportedComment") : t("admin.reportedCampaign")}
        </span>
        <span className="chip">{t(`report.${r.reason}`)}</span>
      </div>
      {isComment && r.commentBody && (
        <blockquote className="report-card__quote">
          “{r.commentBody}” <cite>— {r.commentAuthor}</cite>
        </blockquote>
      )}
      <p className="small">
        {r.campaignTitle ? (
          <Link to={`/campaigns/${r.campaignId}`}>{t("admin.on", { campaign: r.campaignTitle })}</Link>
        ) : null}
      </p>
      {r.details && <p className="report-card__details">{r.details}</p>}
      <p className="muted small">{t("admin.by", { name: r.reporterName, date: formatDate(r.createdAt) })}</p>
      <div className="row-actions row-actions--start">
        <button className="btn btn--outline btn--sm btn--danger" onClick={() => onResolve(r, "remove")}>
          {isComment ? t("admin.removeComment") : t("admin.hideCampaign")}
        </button>
        <button className="btn btn--outline btn--sm" onClick={() => onResolve(r, "dismiss")}>
          {t("admin.dismiss")}
        </button>
      </div>
    </article>
  );
}

function CampaignAdminRow({ c, onChange }) {
  const { t } = useUi();
  return (
    <div className={`row-card admin-row ${c.hidden ? "is-hidden" : ""}`}>
      <img src={campaignImage(c)} alt="" />
      <div className="row-card__body">
        <Link to={`/campaigns/${c.id}`}>
          <strong>{c.title}</strong>
        </Link>
        <span className="muted small">
          {t("admin.byOwner", { name: c.ownerName })} · {formatTaka(c.raised)} / {formatTaka(c.goal)} (
          {formatNumber(percentFunded(c))}%) · {formatDate(c.createdAt)}
        </span>
        <span className="admin-row__badges">
          {c.verified ? (
            <span className="badge-verified">
              <HiBadgeCheck /> {t("card.verified")}
            </span>
          ) : (
            <span className="chip chip--muted">{t("admin.statusUnverified")}</span>
          )}
          {c.hidden && <span className="chip chip--danger">{t("admin.statusHidden")}</span>}
        </span>
      </div>
      <div className="admin-row__actions">
        <button className="btn btn--outline btn--sm" onClick={() => onChange(c, { verified: !c.verified })}>
          <HiBadgeCheck /> {c.verified ? t("admin.unverify") : t("admin.verify")}
        </button>
        <button
          className={`btn btn--outline btn--sm ${c.hidden ? "" : "btn--danger"}`}
          onClick={() => onChange(c, { hidden: !c.hidden })}
        >
          {c.hidden ? <HiEye /> : <HiEyeOff />} {c.hidden ? t("admin.unhide") : t("admin.hide")}
        </button>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, token } = useAuth();
  const { t, tErr, toast } = useUi();
  useDocumentTitle(t("nav.admin"));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("reports");
  const [filter, setFilter] = useState("all");

  const load = useCallback(() => {
    getAdminOverview(token)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    if (user && user.isAdmin) load();
  }, [user, load]);

  if (!user.isAdmin) return <Redirect to="/dashboard" />;

  const onChange = async (c, patch) => {
    if (patch.hidden && !window.confirm(t("admin.confirmHide", { title: c.title }))) return;
    try {
      await adminUpdateCampaign(token, c.id, patch);
      toast(t("toast.adminSaved"));
      load();
    } catch (err) {
      toast(tErr(err.message), "error");
    }
  };

  const onResolve = async (r, action) => {
    if (action === "remove") {
      const ok =
        r.targetType === "comment"
          ? window.confirm(t("admin.confirmRemove"))
          : window.confirm(t("admin.confirmHide", { title: r.campaignTitle || "" }));
      if (!ok) return;
    }
    try {
      await resolveReport(token, r.id, action);
      toast(t("toast.reportResolved"));
      load();
    } catch (err) {
      toast(tErr(err.message), "error");
    }
  };

  const campaigns = data
    ? data.campaigns.filter((c) => (filter === "hidden" ? c.hidden : filter === "unverified" ? !c.verified : true))
    : [];

  return (
    <div className="page container">
      <header className="page__head">
        <span className="eyebrow">{t("nav.admin")}</span>
        <h1>{t("nav.admin")}</h1>
        <p className="muted">{t("admin.lead")}</p>
        {!USING_SERVER && <p className="small muted admin-note">{t("admin.localNote")}</p>}
      </header>

      {error ? (
        <Alert>{tErr(error)}</Alert>
      ) : !data ? (
        <Spinner />
      ) : (
        <>
          <div className="kpis kpis--5">
            <div className="card kpi"><span>{t("admin.users")}</span><strong>{formatNumber(data.stats.users)}</strong></div>
            <div className="card kpi"><span>{t("admin.campaigns")}</span><strong>{formatNumber(data.stats.campaigns)}</strong></div>
            <div className="card kpi"><span>{t("admin.pledges")}</span><strong>{formatNumber(data.stats.pledges)}</strong></div>
            <div className="card kpi"><span>{t("admin.raised")}</span><strong>{formatTaka(data.stats.raised)}</strong></div>
            <div className={`card kpi ${data.stats.openReports ? "kpi--alert" : ""}`}>
              <span>{t("admin.openReports")}</span>
              <strong>{formatNumber(data.stats.openReports)}</strong>
            </div>
          </div>

          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "reports"} className={`tabs__btn ${tab === "reports" ? "is-active" : ""}`} onClick={() => setTab("reports")}>
              {t("admin.tabReports", { n: formatNumber(data.reports.length) })}
            </button>
            <button role="tab" aria-selected={tab === "campaigns"} className={`tabs__btn ${tab === "campaigns" ? "is-active" : ""}`} onClick={() => setTab("campaigns")}>
              {t("admin.tabCampaigns")}
            </button>
          </div>

          {tab === "reports" ? (
            data.reports.length ? (
              <div className="grid grid--2">
                {data.reports.map((r) => (
                  <ReportCard key={r.id} r={r} onResolve={onResolve} />
                ))}
              </div>
            ) : (
              <div className="empty">
                <h3>{t("admin.noReports")}</h3>
              </div>
            )
          ) : (
            <>
              <div className="category-row category-row--left" role="group" aria-label={t("admin.filterLabel")}>
                {["all", "unverified", "hidden"].map((f) => (
                  <button key={f} className={`chip chip--link ${filter === f ? "is-active" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                    {t(`admin.filter${f[0].toUpperCase()}${f.slice(1)}`)}
                  </button>
                ))}
              </div>
              <div className="stack">
                {campaigns.map((c) => (
                  <CampaignAdminRow key={c.id} c={c} onChange={onChange} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
