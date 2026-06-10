import { Header } from '@/src/components/layout/Header';

export default function DashboardLoading() {
  return (
    <>
      <Header title="Tableau de bord" />

      <div className="flex-1 space-y-8 p-6">
        {/* KPIs Skeleton */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Vue d&apos;ensemble
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5 shadow-sm animate-pulse"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 w-full">
                    <div className="h-4 w-24 rounded bg-muted"></div>
                    <div className="h-8 w-16 rounded bg-muted"></div>
                    <div className="h-3 w-32 rounded bg-muted"></div>
                  </div>
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-muted"></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Actions rapides Skeleton */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm animate-pulse"
              >
                <div className="h-10 w-10 shrink-0 rounded-lg bg-muted"></div>
                <div className="space-y-2 w-full">
                  <div className="h-4 w-32 rounded bg-muted"></div>
                  <div className="h-3 w-48 rounded bg-muted"></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
