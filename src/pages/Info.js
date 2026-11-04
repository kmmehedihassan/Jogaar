import React from "react";
import { Link } from "react-router-dom";
import { HiShieldCheck, HiHeart, HiChartBar } from "react-icons/hi";
import Faq from "../components/Faq";
import { useDocumentTitle } from "../components/common";
import { useUi } from "../context/UiContext";
import { STORIES } from "../data/seed";
import { formatTaka } from "../utils/format";
import { Steps, storyText } from "./Home";

export function HowItWorks() {
  const { t } = useUi();
  useDocumentTitle(t("nav.how"));
  return (
    <div className="page">
      <div className="container">
        <header className="page__head page__head--center">
          <span className="eyebrow">{t("nav.how")}</span>
          <h1>{t("how.title")}</h1>
          <p className="muted lead">{t("how.lead")}</p>
        </header>
        <Steps />
      </div>

      <section className="section section--tint">
        <div className="container grid grid--2 split">
          <div>
            <h2>{t("how.forEntrepreneurs")}</h2>
            <ul className="ticks">
              {["e1", "e2", "e3", "e4"].map((k) => (
                <li key={k}>{t(`how.${k}`)}</li>
              ))}
            </ul>
            <Link to="/start" className="btn btn--primary">{t("nav.start")}</Link>
          </div>
          <div>
            <h2>{t("how.forBackers")}</h2>
            <ul className="ticks">
              {["b1", "b2", "b3", "b4"].map((k) => (
                <li key={k}>{t(`how.${k}`)}</li>
              ))}
            </ul>
            <Link to="/discover" className="btn btn--outline">{t("home.discover")}</Link>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="grid grid--3">
          {[
            [HiShieldCheck, "f1"],
            [HiHeart, "f2"],
            [HiChartBar, "f3"],
          ].map(([Icon, k]) => (
            <div key={k} className="feature">
              <Icon size={28} />
              <h3>{t(`how.${k}Title`)}</h3>
              <p className="muted">{t(`how.${k}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="section section--tint">
        <div className="container faq-layout">
          <div>
            <span className="eyebrow">{t("faq.label")}</span>
            <h2>{t("how.faqTitle")}</h2>
          </div>
          <Faq />
        </div>
      </section>
    </div>
  );
}

export function Stories() {
  const { t, lang } = useUi();
  useDocumentTitle(t("nav.stories"));
  return (
    <div className="page container">
      <header className="page__head page__head--center">
        <span className="eyebrow">{t("nav.stories")}</span>
        <h1>{t("stories.title")}</h1>
        <p className="muted lead">{t("stories.lead")}</p>
      </header>
      <div className="stories">
        {STORIES.map((raw, i) => {
          const s = storyText(raw, lang);
          return (
            <article id={s.id} key={s.id} className={`story ${i % 2 ? "story--flip" : ""}`}>
              <img src={s.image} alt={s.name} loading="lazy" />
              <div>
                <span className="eyebrow">{s.business}</span>
                <h2>{s.title}</h2>
                {s.body.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                <p className="story__raised">{t("stories.raised", { amount: formatTaka(s.raised) })}</p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="cta-band">
        <div>
          <h2>{t("stories.ctaTitle")}</h2>
          <p>{t("stories.ctaText")}</p>
        </div>
        <Link to="/start" className="btn btn--accent btn--lg">{t("nav.start")}</Link>
      </div>
    </div>
  );
}
