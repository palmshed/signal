export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-14">
      <div className="flex flex-col items-center">
        <div className="h-20 w-20 animate-pulse rounded-full bg-neutral-200" />
        <div className="mt-4 h-6 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="mt-2 h-3 w-56 animate-pulse rounded bg-neutral-100" />
      </div>
      <div className="mt-8 flex flex-col gap-2">
        <div className="h-11 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-11 animate-pulse rounded-lg bg-neutral-100" />
      </div>
      <div className="mt-10 flex flex-col gap-4">
        <div className="h-40 animate-pulse rounded-xl bg-neutral-200" />
        <div className="h-40 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    </main>
  );
}
