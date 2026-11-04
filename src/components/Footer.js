import React from "react";
import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa";
import { useUi } from "../context/UiContext";
import { formatNumber } from "../utils/format";
import Logo from "./Logo";

export default function Footer() {
  const { t } = useUi();
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Logo light />
          <p>{t("footer.tagline")}</p>
          <div className="footer__social">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebookF />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <FaTwitter />
            </a>
          </div>
        </div>

        <div>
          <h4>{t("footer.explore")}</h4>
          <ul>
            <li><Link to="/discover">{t("footer.discover")}</Link></li>
            <li><Link to="/stories">{t("footer.stories")}</Link></li>
            <li><Link to="/start">{t("nav.start")}</Link></li>
          </ul>
        </div>

        <div>
          <h4>{t("footer.help")}</h4>
          <ul>
            <li><Link to="/how-it-works">{t("nav.how")}</Link></li>
            <li><Link to="/how-it-works#faq">{t("footer.faq")}</Link></li>
            <li><Link to="/register">{t("footer.register")}</Link></li>
          </ul>
        </div>

        <div>
          <h4>{t("footer.contact")}</h4>
          <ul>
            <li><a href="mailto:hello@jogaar.example">hello@jogaar.example</a></li>
            <li>{t("footer.address")}</li>
          </ul>
        </div>
      </div>
      <div className="container footer__bottom">
        {t("footer.rights", { year: formatNumber(new Date().getFullYear()).replace(/,/g, "") })}
      </div>
    </footer>
  );
}
