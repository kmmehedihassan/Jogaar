import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { HiSearch } from "react-icons/hi";
import CampaignCard from "../components/CampaignCard";
import { Spinner, useDocumentTitle } from "../components/common";
import { listCampaigns } from "../api/client";
import { CATEGORIES } from "../data/seed";
import { isEnded, percentFunded } from "../utils/format";

const SORTS = {
  trending: { label: "Most backers", fn: (a, b) => b.backers - a.backers },
  funded: { label: "Most funded", fn: (a, b) => percentFunded(b) - percentFunded(a) },
  ending: { label: "Ending soon", fn: (a, b) => a.endsAt - b.endsAt },
  newest: { label: "Newest", fn: (a, b) => b.createdAt - a.createdAt },
};

export default function Discover() {
  useDocumentTitle("Discover campaigns");
  const location = useLocation();
  const history = useHistory();
  const params = new URLSearchParams(location.search);
  const category = params.get("category") || "All";
  const [query, setQuery] = useState(params.get("q") || "");
  const [sort, setSort] = useState("trending");
  const [showEnded, setShowEnded] = useState(false);
  const [campaigns, setCampaigns] = useState(null);

  useEffect(() => {
    let alive = true;
    listCampaigns().then((c) => alive && setCampaigns(c));
    return () => {
      alive = false;
    };
  }, []);

  const setCategory = (cat) => {
    const next = new URLSearchParams(location.search);
    if (cat === "All") next.delete("category");
    else next.set("category", cat);
    history.replace({ search: next.toString() });
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
          [c.title, c.summary, c.location, c.ownerName, c.category]
            .join(" ")
            .toLowerCase()
            .includes(q)
      )
      .sort(SORTS[sort].fn);
  }, [campaigns, query, category, sort, showEnded]);

  return (
    <div className="page container">
      <header className="page__head">
        <span className="eyebrow">Discover</span>
        <h1>Back a local business</h1>
        <p className="muted">Every contribution helps a real entrepreneur in Bangladesh.</p>
      </header>

      <div className="toolbar">
        <label className="search">
          <HiSearch aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name, place or owner"
            aria-label="Search campaigns"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="toolbar__right">
          <label className="checkbox">
            <input type="checkbox" checked={showEnded} onChange={(e) => setShowEnded(e.target.checked)} />
            Show ended
          </label>
          <select className="input input--sm" aria-label="Sort campaigns" value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="category-row category-row--left" role="tablist" aria-label="Categories">
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={category === cat}
            className={`chip chip--link ${category === cat ? "is-active" : ""}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {!campaigns ? (
        <Spinner />
      ) : results.length ? (
        <>
          <p className="muted small">{results.length} campaign{results.length === 1 ? "" : "s"}</p>
          <div className="grid grid--3">
            {results.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        </>
      ) : (
        <div className="empty">
          <h3>No campaigns match your search</h3>
          <p className="muted">Try a different keyword or category.</p>
          <button className="btn btn--outline" onClick={() => { setQuery(""); setCategory("All"); }}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
