"use client";

import { useSyncExternalStore } from "react";
import type { SiteContent } from "@/lib/content-types";
import { consentStore } from "./browser-store";

export function AnalyticsConsent({ analytics }: { analytics: SiteContent["ui"]["analytics"] }) {
  const decision = useSyncExternalStore(
    consentStore.subscribe,
    consentStore.getSnapshot,
    consentStore.getServerSnapshot,
  );

  // Server-rendered as "undecided"; the banner is hidden until the visitor has
  // actually chosen, and never appears at all while analytics are switched off.
  if (!analytics.enabled || decision !== "undecided") return null;

  return (
    <div className="analytics-consent">
      <div className="analytics-consent__copy">
        <strong>{analytics.title}</strong>
        <p>{analytics.description}</p>
        <div className="analytics-consent__links">
          <a href={analytics.privacyLink.href}>{analytics.privacyLink.label}</a>
          <a href={analytics.cookieLink.href}>{analytics.cookieLink.label}</a>
        </div>
      </div>
      <div className="analytics-consent__actions">
        <button className="button button--secondary" onClick={() => consentStore.write("rejected")}>
          {analytics.rejectLabel}
        </button>
        <button className="button button--primary" onClick={() => consentStore.write("accepted")}>
          {analytics.acceptLabel}
        </button>
      </div>
    </div>
  );
}
