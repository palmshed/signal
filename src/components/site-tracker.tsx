"use client";

import { useEffect } from "react";
import { trackPageview } from "./track";

export function SiteTracker() {
  useEffect(() => {
    trackPageview();
  }, []);
  return null;
}
