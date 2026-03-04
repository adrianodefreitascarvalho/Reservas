import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { role, loading, user } = useAuth();

  if (loading) return <p className="text-muted-foreground p-6">A carregar...</p>;

  const isSuperAdmin = user?.email === "adrianodefreitascarvalho@gmail.com";
  const effectiveRole = isSuperAdmin ? "admin" : role;

  if (allowedRoles && effectiveRole && !allowedRoles.includes(effectiveRole)) {
    return <Navigate to="/calendar" replace />;
  }

  return <>{children}</>;
}
