"use client";

import { useEffect, useState } from "react";

const WELCOME_SESSION_KEY = "fespa-dashboard-welcome-seen-v2";

export function DashboardWelcome({ greeting, name }: { greeting: string; name: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(WELCOME_SESSION_KEY)) return;

    window.sessionStorage.setItem(WELCOME_SESSION_KEY, "true");
    const frame = window.requestAnimationFrame(() => setVisible(true));
    const timeout = window.setTimeout(() => setVisible(false), 1900);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="dashboard-welcome" role="status" aria-live="polite">
      <div className="dashboard-welcome__halo" aria-hidden="true" />
      <div className="dashboard-welcome__spark dashboard-welcome__spark--one" aria-hidden="true" />
      <div className="dashboard-welcome__spark dashboard-welcome__spark--two" aria-hidden="true" />
      <div className="dashboard-welcome__spark dashboard-welcome__spark--three" aria-hidden="true" />
      <p className="dashboard-welcome__eyebrow">FESPA COACH AI</p>
      <p className="dashboard-welcome__title">
        {greeting} <span>{name}</span>
      </p>
    </div>
  );
}