import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HiArrowRight, HiLightBulb, HiShare, HiCash } from "react-icons/hi";
import hero from "../assets/images/hero.jpg";
import CampaignCard from "../components/CampaignCard";
import Faq from "../components/Faq";
import { useDocumentTitle } from "../components/common";
import { CardGridSkeleton } from "../components/Skeleton";
import { listCampaigns } from "../api/client";
import { useUi } from "../context/UiContext";
import { CATEGORIES, STORIES } from "../data/seed";
import { formatNumber, formatTaka, isEnded, percentFunded } from "../utils/format";

export const STEPS = [
  { icon: HiLightBulb, key: "step1" },
  { icon: HiShare, key: "step2" },
  { icon: HiCash, key: "step3" },
];

export function Steps() {
  const { t } = useUi();
  return (
    <div className="grid grid--3">
      {STEPS.map(({ icon: Icon, key }, i) => (
        <div key={key} className="step">
          <span className="step__icon"><Icon size={26} /></span>
          <span className="step__num">{formatNumber(0)}{formatNumber(i + 1)}</span>
          <h3>{t(`${key}.title`)}</h3>
          <p className="muted">{t(`${key}.text`)}</p>
        </div>
      ))}
    </div>
  );
}

/** Story text in the current language. */
export function storyText(story, lang) {
  return lang === "bn" && story.bn ? { ...story, ...story.bn } : story;
}

export default function Home() {
  const { t, lang } = useUi();
  useDocumentTitle();
  const [campaigns, setCampaigns] = useState(null);

  useEffect(() => {
    let alive = true;
    listCampaigns()
      .then((c) => alive && setCampaigns(c))
      .catch(() => alive && setCampaigns([]));
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const all = campaigns || [];
    const storyTotal = STORIES.reduce((s, x) => s + x.raised, 0);
    return {
      raised: all.reduce((s, c) => s + c.raised, 0) + storyTotal,
      backers: all.reduce((s, c) => s + c.backers, 0),
      live: all.filter((c) => !isEnded(c)).length,
    };
  }, [campaigns]);

  const featured = useMemo(
    () =>
      (campaigns || [])
        .filter((c) => !isEnded(c))
        .sort((a, b) => percentFunded(b) - percentFunded(a))
        .slice(0, 3),
    [campaigns]
  );

  return (
    <>
      <section className="hero">
        <img className="hero__bg" src={hero} alt="" />
        <div className="hero__overlay" />
        <div className="container hero__content">
          <span className="eyebrow eyebrow--light">{t("home.eyebrow")}</span>
          <h1>
            {t("home.title1")}
            <br />
            <span className="hl">{t("home.title2")}</span>
          </h1>
          <p className="hero__lead">{t("home.lead")}</p>
          <div className="hero__cta">
            <Link to="/discover" className="btn btn--primary btn--lg">{t("home.discover")}</Link>
            <Link to="/start" className="btn btn--ghost-light btn--lg">{t("nav.start")}</Link>
          </div>
        </div>
      </section>

      <section className="stats container">
        <div>
          <strong>{formatTaka(stats.raised)}</strong>
          <span>{t("home.statRaised")}</span>
        </div>
        <div>
          <strong>{formatNumber(stats.backers)}</strong>
          <span>{t("home.statBackers")}</span>
        </div>
        <div>
          <strong>{formatNumber(stats.live)}</strong>
          <span>{t("home.statLive")}</span>
        </div>
      </section>

      <section className="section container">
        <div className="section__head">
          <div>
            <span className="eyebrow">{t("home.featured")}</span>
            <h2>{t("home.featuredTitle")}</h2>
          </div>
          <Link to="/discover" className="link-arrow">
            {t("home.viewAll")} <HiArrowRight />
          </Link>
        </div>
        {campaigns ? (
          <div className="grid grid--3">
            {featured.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        ) : (
          <CardGridSkeleton />
        )}
        <div className="category-row">
          {CATEGORIES.map((cat) => (
            <Link key={cat} to={`/discover?category=${encodeURIComponent(cat)}`} className="chip chip--link">
              {t(`category.${cat}`)}
            </Link>
          ))}
        </div>
      </section>

      <section className="section section--tint">
        <div className="container">
          <div className="section__head section__head--center">
            <span className="eyebrow">{t("nav.how")}</span>
            <h2>{t("home.howTitle")}</h2>
          </div>
          <Steps />
        </div>
      </section>

      <section className="section container">
        <div className="section__head">
          <div>
            <span className="eyebrow">{t("nav.stories")}</span>
            <h2>{t("home.storiesTitle")}</h2>
          </div>
          <Link to="/stories" className="link-arrow">
            {t("home.readAll")} <HiArrowRight />
          </Link>
        </div>
        <div className="grid grid--4">
          {STORIES.map((raw) => {
            const s = storyText(raw, lang);
            return (
              <Link key={s.id} to={`/stories#${s.id}`} className="card story-card">
                <div className="story-card__media">
                  <img src={s.image} alt={s.name} loading="lazy" />
                </div>
                <div className="story-card__body">
                  <h3>{s.title}</h3>
                  <p className="muted">{s.excerpt}</p>
                  <span className="link-arrow">{t("home.readStory")} <HiArrowRight /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section section--tint">
        <div className="container faq-layout">
          <div>
            <span className="eyebrow">{t("faq.label")}</span>
            <h2>{t("home.faqTitle")}</h2>
            <p className="muted">
              {t("home.faqText")} <Link to="/how-it-works">{t("home.faqLink")}</Link>.
            </p>
          </div>
          <Faq />
        </div>
      </section>

      <section className="section container">
        <div className="cta-band">
          <div>
            <h2>{t("home.ctaTitle")}</h2>
            <p>{t("home.ctaText")}</p>
          </div>
          <Link to="/register" className="btn btn--accent btn--lg">{t("home.ctaBtn")}</Link>
        </div>
      </section>
    </>
  );
}
