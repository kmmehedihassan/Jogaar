import React from "react";
import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Logo light />
          <p>
            Crowdfunding for small businesses and aspiring entrepreneurs across
            Bangladesh.
          </p>
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
          <h4>Explore</h4>
          <ul>
            <li><Link to="/discover">Discover campaigns</Link></li>
            <li><Link to="/stories">Success stories</Link></li>
            <li><Link to="/start">Start a campaign</Link></li>
          </ul>
        </div>

        <div>
          <h4>Help</h4>
          <ul>
            <li><Link to="/how-it-works">How it works</Link></li>
            <li><Link to="/how-it-works#faq">FAQ</Link></li>
            <li><Link to="/register">Create an account</Link></li>
          </ul>
        </div>

        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:hello@jogaar.example">hello@jogaar.example</a></li>
            <li>Dhaka, Bangladesh</li>
          </ul>
        </div>
      </div>
      <div className="container footer__bottom">
        © {new Date().getFullYear()} Jogaar Ltd. All rights reserved.
      </div>
    </footer>
  );
}
