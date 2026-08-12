"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-14 text-center">
      <p className="text-sm text-neutral-500">
        Something went wrong rendering this page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 text-sm font-medium text-neutral-800 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-500"
      >
        Try again
      </button>
    </main>
  );
}
