import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { role, loading } = useAuth();

  if (loading) return <p className="text-muted-foreground p-6">A carregar...</p>;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/calendar" replace />;
  }

  return <>{children}</>;
}
