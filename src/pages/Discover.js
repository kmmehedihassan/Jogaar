import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { HiSearch } from "react-icons/hi";
import CampaignCard from "../components/CampaignCard";
import { Alert, useDocumentTitle } from "../components/common";
import { CardGridSkeleton } from "../components/Skeleton";
import { listCampaigns } from "../api/client";
import { useUi } from "../context/UiContext";
import { CATEGORIES } from "../data/seed";
import { formatNumber, isEnded, percentFunded } from "../utils/format";

const PAGE_SIZE = 6;

const SORTS = {
  trending: (a, b) => b.backers - a.backers,
  funded: (a, b) => percentFunded(b) - percentFunded(a),
  ending: (a, b) => a.endsAt - b.endsAt,
  newest: (a, b) => b.createdAt - a.createdAt,
};

export default function Discover() {
  const { t, tErr } = useUi();
  useDocumentTitle(t("discover.title"));
  const location = useLocation();
  const history = useHistory();
  const params = new URLSearchParams(location.search);
  const category = params.get("category") || "All";
  const [query, setQueryState] = useState(params.get("q") || "");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [sort, setSort] = useState("trending");
  const [showEnded, setShowEnded] = useState(false);
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    listCampaigns()
      .then((c) => alive && setCampaigns(c))
      .catch((err) => {
        if (!alive) return;
        setCampaigns([]);
        setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setParam = (key, value) => {
    const next = new URLSearchParams(location.search);
    if (!value || value === "All") next.delete(key);
    else next.set(key, value);
    history.replace({ search: next.toString() });
  };
  const setCategory = (cat) => {
    setLimit(PAGE_SIZE);
    setParam("category", cat);
  };
  const setQuery = (q) => {
    setQueryState(q);
    setLimit(PAGE_SIZE);
    setParam("q", q.trim());
  };

  const results = useMemo(() => {
    if (!campaigns) return [];
    const q = query.trim().toLowerCase();
    return campaigns
      .filter((c) => showEnded || !isEnded(c))
      .filter((c) => category === "All" || c.category === category)
      .filter(
        (c) =>
          !q ||
          [c.title, c.summary, c.location, c.ownerName, c.category, t(`category.${c.category}`)]
            .join(" ")
            .toLowerCase()
            .includes(q)
      )
      .sort(SORTS[sort]);
  }, [campaigns, query, category, sort, showEnded, t]);

  return (
    <div className="page container">
      <header className="page__head">
        <span className="eyebrow">{t("discover.eyebrow")}</span>
        <h1>{t("discover.title")}</h1>
        <p className="muted">{t("discover.lead")}</p>
      </header>

      <div className="toolbar">
        <label className="search">
          <HiSearch aria-hidden="true" />
          <input
            type="search"
            placeholder={t("discover.search")}
            aria-label={t("discover.searchLabel")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="toolbar__right">
          <label className="checkbox">
            <input type="checkbox" checked={showEnded} onChange={(e) => setShowEnded(e.target.checked)} />
            {t("discover.showEnded")}
          </label>
          <select
            className="input input--sm"
            aria-label={t("discover.sortLabel")}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {Object.keys(SORTS).map((key) => (
              <option key={key} value={key}>
                {t(`discover.sort.${key}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="category-row category-row--left" role="tablist" aria-label={t("discover.categories")}>
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={category === cat}
            className={`chip chip--link ${category === cat ? "is-active" : ""}`}
            onClick={() => setCategory(cat)}
          >
            {cat === "All" ? t("discover.all") : t(`category.${cat}`)}
          </button>
        ))}
      </div>

      <Alert>{error && tErr(error)}</Alert>

      {!campaigns ? (
        <CardGridSkeleton count={6} />
      ) : results.length ? (
        <>
          <p className="muted small">
            {t("discover.showing", {
              shown: formatNumber(Math.min(limit, results.length)),
              total: formatNumber(results.length),
            })}
          </p>
          <div className="grid grid--3">
            {results.slice(0, limit).map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
          {results.length > limit && (
            <div className="load-more">
              <button className="btn btn--outline" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                {t("discover.loadMore", { n: formatNumber(results.length - limit) })}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <h3>{t("discover.emptyTitle")}</h3>
          <p className="muted">{t("discover.emptyText")}</p>
          <button
            className="btn btn--outline"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
          >
            {t("discover.clear")}
          </button>
        </div>
      )}
    </div>
  );
}
