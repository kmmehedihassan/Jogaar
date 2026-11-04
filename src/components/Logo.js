import React from "react";

export default function Logo({ light = false }) {
  return (
    <span className={`logo ${light ? "logo--light" : ""}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="var(--primary)" />
        <path
          d="M19 8v10.5a5 5 0 0 1-10 0"
          fill="none"
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="23.5" cy="9.5" r="2.6" fill="var(--accent)" />
      </svg>
      Jogaar
    </span>
  );
}
