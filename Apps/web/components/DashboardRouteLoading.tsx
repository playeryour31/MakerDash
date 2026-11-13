/** Shared route-level loading UI for dashboard navigation. */
export function DashboardListLoading() {
  return (
    <main
      className="relative mx-auto w-full max-w-[100rem] space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-10"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-36 w-full animate-pulse rounded-2xl border border-white/10 bg-card" />
      <section className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="min-h-[16rem] w-full animate-pulse rounded-2xl border border-white/10 bg-card/70"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </section>
    </main>
  );
}

export function BotRouteLoading() {
  return (
    <main className="dashboard-page" aria-busy="true" aria-label="Loading">
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/70" />
        <div className="mt-6 h-40 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </main>
  );
}

export function BotSidebarPlaceholder() {
  return (
    <div
      className="pointer-events-none fixed inset-y-0 start-0 z-40 hidden w-[280px] border-e border-border bg-card/40 lg:block"
      aria-hidden
    />
  );
}
