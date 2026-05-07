import { Header } from '@/src/components/layout/Header';

export default function ParcoursLoading() {
  return (
    <>
      <Header title="Mes Parcours" />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="h-10 w-full sm:w-64 bg-muted animate-pulse rounded-md"></div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="h-10 w-32 bg-muted animate-pulse rounded-md"></div>
            <div className="h-10 w-40 bg-primary/20 animate-pulse rounded-md"></div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3"><div className="h-4 w-12 bg-muted rounded"></div></th>
                <th className="px-4 py-3"><div className="h-4 w-32 bg-muted rounded"></div></th>
                <th className="px-4 py-3"><div className="h-4 w-20 bg-muted rounded"></div></th>
                <th className="px-4 py-3"><div className="h-4 w-16 bg-muted rounded"></div></th>
                <th className="px-4 py-3"><div className="h-4 w-16 bg-muted rounded"></div></th>
                <th className="px-4 py-3"><div className="h-4 w-12 bg-muted rounded"></div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-12 w-16 rounded bg-muted"></div></td>
                  <td className="px-4 py-3 space-y-2"><div className="h-4 w-48 rounded bg-muted"></div><div className="h-3 w-32 rounded bg-muted"></div></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-muted"></div></td>
                  <td className="px-4 py-3"><div className="h-6 w-20 rounded-full bg-muted"></div></td>
                  <td className="px-4 py-3"><div className="h-6 w-16 rounded-full bg-muted"></div></td>
                  <td className="px-4 py-3 text-right"><div className="ml-auto h-8 w-24 rounded bg-muted"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
