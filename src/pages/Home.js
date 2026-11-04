import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HiArrowRight, HiLightBulb, HiShare, HiCash } from "react-icons/hi";
import hero from "../assets/images/hero.jpg";
import CampaignCard from "../components/CampaignCard";
import Faq from "../components/Faq";
import { useDocumentTitle } from "../components/common";
import { CardGridSkeleton } from "../components/Skeleton";
import { listCampaigns } from "../api/client";
import { CATEGORIES, STORIES } from "../data/seed";
import { formatNumber, formatTaka, isEnded, percentFunded } from "../utils/format";

export const STEPS = [
  {
    icon: HiLightBulb,
    title: "Share your idea",
    text: "Tell your story, set a funding goal and a deadline. It takes about ten minutes.",
  },
  {
    icon: HiShare,
    title: "Rally supporters",
    text: "Share your campaign with friends, family and the Jogaar community.",
  },
  {
    icon: HiCash,
    title: "Grow your business",
    text: "Receive the funds when your campaign ends and keep backers updated.",
  },
];

export default function Home() {
  useDocumentTitle();
  const [campaigns, setCampaigns] = useState(null);

  useEffect(() => {
    let alive = true;
    listCampaigns().then((c) => alive && setCampaigns(c));
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
          <span className="eyebrow eyebrow--light">Crowdfunding for Bangladesh</span>
          <h1>
            Small businesses,
            <br />
            <span className="hl">big dreams.</span>
          </h1>
          <p className="hero__lead">
            Jogaar helps local entrepreneurs raise the money they need from
            people who believe in them.
          </p>
          <div className="hero__cta">
            <Link to="/discover" className="btn btn--primary btn--lg">
              Discover campaigns
            </Link>
            <Link to="/start" className="btn btn--ghost-light btn--lg">
              Start a campaign
            </Link>
          </div>
        </div>
      </section>

      <section className="stats container">
        <div>
          <strong>{formatTaka(stats.raised)}</strong>
          <span>raised for local businesses</span>
        </div>
        <div>
          <strong>{formatNumber(stats.backers)}</strong>
          <span>backers on live campaigns</span>
        </div>
        <div>
          <strong>{stats.live}</strong>
          <span>campaigns open now</span>
        </div>
      </section>

      <section className="section container">
        <div className="section__head">
          <div>
            <span className="eyebrow">Featured</span>
            <h2>Campaigns close to their goal</h2>
          </div>
          <Link to="/discover" className="link-arrow">
            View all <HiArrowRight />
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
              {cat}
            </Link>
          ))}
        </div>
      </section>

      <section className="section section--tint">
        <div className="container">
          <div className="section__head section__head--center">
            <span className="eyebrow">How it works</span>
            <h2>From idea to open doors in three steps</h2>
          </div>
          <div className="grid grid--3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="step">
                <span className="step__icon"><Icon size={26} /></span>
                <span className="step__num">0{i + 1}</span>
                <h3>{title}</h3>
                <p className="muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section__head">
          <div>
            <span className="eyebrow">Success stories</span>
            <h2>Businesses our community built</h2>
          </div>
          <Link to="/stories" className="link-arrow">
            Read all stories <HiArrowRight />
          </Link>
        </div>
        <div className="grid grid--4">
          {STORIES.map((s) => (
            <Link key={s.id} to={`/stories#${s.id}`} className="card story-card">
              <div className="story-card__media">
                <img src={s.image} alt={s.name} loading="lazy" />
              </div>
              <div className="story-card__body">
                <h3>{s.title}</h3>
                <p className="muted">{s.excerpt}</p>
                <span className="link-arrow">Read story <HiArrowRight /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section section--tint">
        <div className="container faq-layout">
          <div>
            <span className="eyebrow">FAQ</span>
            <h2>Questions, answered</h2>
            <p className="muted">
              Can't find what you're looking for? Read the full guide on{" "}
              <Link to="/how-it-works">how Jogaar works</Link>.
            </p>
          </div>
          <Faq />
        </div>
      </section>

      <section className="section container">
        <div className="cta-band">
          <div>
            <h2>Still not convinced? See for yourself.</h2>
            <p>Create a free account and back your first local business today.</p>
          </div>
          <Link to="/register" className="btn btn--accent btn--lg">
            Get started
          </Link>
        </div>
      </section>
    </>
  );
}
