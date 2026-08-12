"use client";

import type { MouseEvent } from "react";
import { trackClick } from "./track";

export function TrackedLink({
  id,
  label,
  url,
}: {
  id: string;
  label: string;
  url: string;
}) {
  function onClick(e: MouseEvent) {
    e.stopPropagation();
    trackClick({ linkId: id, targetUrl: url });
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      className="block w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      {label}
    </a>
  );
}
