import { Sidebar } from '@/src/components/layout/Sidebar';

/** Layout principal avec la Sidebar — wrappé autour de tous les écrans /dashboard */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar fixe à gauche */}
      <Sidebar />

      {/* Contenu principal scrollable */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
