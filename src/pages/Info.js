import React from "react";
import { Link } from "react-router-dom";
import { HiShieldCheck, HiHeart, HiChartBar } from "react-icons/hi";
import Faq from "../components/Faq";
import { useDocumentTitle } from "../components/common";
import { STORIES } from "../data/seed";
import { formatTaka } from "../utils/format";
import { STEPS } from "./Home";

export function HowItWorks() {
  useDocumentTitle("How it works");
  return (
    <div className="page">
      <div className="container">
        <header className="page__head page__head--center">
          <span className="eyebrow">How it works</span>
          <h1>Crowdfunding made simple</h1>
          <p className="muted lead">
            Jogaar connects entrepreneurs with people who want to see local
            businesses succeed.
          </p>
        </header>
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

      <section className="section section--tint">
        <div className="container grid grid--2 split">
          <div>
            <h2>For entrepreneurs</h2>
            <ul className="ticks">
              <li>Free to start — no upfront costs</li>
              <li>Set your own goal from ৳10,000 to ৳1 crore</li>
              <li>Campaigns run for 15 to 60 days</li>
              <li>Track every contribution from your dashboard</li>
            </ul>
            <Link to="/start" className="btn btn--primary">Start a campaign</Link>
          </div>
          <div>
            <h2>For backers</h2>
            <ul className="ticks">
              <li>Contribute from ৳100 with bKash, Nagad or card</li>
              <li>Leave a message of support, or give anonymously</li>
              <li>See exactly how much each campaign has raised</li>
              <li>Keep a history of everything you've backed</li>
            </ul>
            <Link to="/discover" className="btn btn--outline">Discover campaigns</Link>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="grid grid--3">
          <div className="feature"><HiShieldCheck size={28} /><h3>Verified owners</h3><p className="muted">Every campaign owner is reviewed before funds are released.</p></div>
          <div className="feature"><HiHeart size={28} /><h3>Community first</h3><p className="muted">Built for neighbourhood businesses, not big corporations.</p></div>
          <div className="feature"><HiChartBar size={28} /><h3>Transparent progress</h3><p className="muted">Live totals, backer counts and deadlines on every campaign.</p></div>
        </div>
      </section>

      <section id="faq" className="section section--tint">
        <div className="container faq-layout">
          <div>
            <span className="eyebrow">FAQ</span>
            <h2>Frequently asked questions</h2>
          </div>
          <Faq />
        </div>
      </section>
    </div>
  );
}

export function Stories() {
  useDocumentTitle("Success stories");
  return (
    <div className="page container">
      <header className="page__head page__head--center">
        <span className="eyebrow">Success stories</span>
        <h1>Real people, real businesses</h1>
        <p className="muted lead">These entrepreneurs turned community support into thriving businesses.</p>
      </header>
      <div className="stories">
        {STORIES.map((s, i) => (
          <article id={s.id} key={s.id} className={`story ${i % 2 ? "story--flip" : ""}`}>
            <img src={s.image} alt={s.name} loading="lazy" />
            <div>
              <span className="eyebrow">{s.business}</span>
              <h2>{s.title}</h2>
              {s.body.map((p, j) => <p key={j}>{p}</p>)}
              <p className="story__raised">Raised {formatTaka(s.raised)} on Jogaar</p>
            </div>
          </article>
        ))}
      </div>
      <div className="cta-band">
        <div>
          <h2>Your story could be next.</h2>
          <p>Start a campaign today — it's free.</p>
        </div>
        <Link to="/start" className="btn btn--accent btn--lg">Start a campaign</Link>
      </div>
    </div>
  );
}
