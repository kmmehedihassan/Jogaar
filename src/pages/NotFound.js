import React from "react";
import { Link } from "react-router-dom";
import { useDocumentTitle } from "../components/common";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <div className="page container notfound">
      <span className="notfound__code">404</span>
      <h1>We couldn't find that page</h1>
      <p className="muted">The link may be broken, or the page may have moved.</p>
      <div className="hero__cta">
        <Link to="/" className="btn btn--primary">Go home</Link>
        <Link to="/discover" className="btn btn--outline">Discover campaigns</Link>
      </div>
    </div>
  );
}
