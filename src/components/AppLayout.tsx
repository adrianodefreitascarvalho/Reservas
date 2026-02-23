import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <SidebarProvider>
        <AppSidebar />
        {/* A sidebar é fixa, então adicionamos uma margem à área de conteúdo principal em ecrãs médios ou maiores (md) */}
        <div className="flex min-h-screen flex-col md:ml-64">
          <header className="flex h-14 items-center border-b bg-background px-4">
            <SidebarTrigger />
            <h1 className="ml-4 text-lg font-semibold">Gestão das Reservas</h1>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
