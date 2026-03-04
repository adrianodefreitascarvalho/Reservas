import { Calendar, Plus, List, Settings, Users, DoorOpen, LogOut, Archive } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { role, user, signOut } = useAuth();

  const menuItems = [
    { title: "Calendário", url: "/calendar", icon: Calendar, roles: ["admin", "member", "direction"] },
    { title: "Nova Reserva", url: "/bookings/new", icon: Plus, roles: ["admin", "member"] },
    { title: "As Minhas Reservas", url: "/my-bookings", icon: List, roles: ["admin", "member"] },
    { title: "Gestão de Reservas", url: "/admin", icon: Settings, roles: ["admin"] },
    { title: "Reservas Arquivadas", url: "/admin/archived", icon: Archive, roles: ["admin"] },
    { title: "Gestão de Salas", url: "/admin/rooms", icon: DoorOpen, roles: ["admin"] },
    { title: "Gestão de Utilizadores", url: "/admin/users", icon: Users, roles: ["admin"] },
  ];

  const isSuperAdmin = user?.email === "adrianodefreitascarvalho@gmail.com";
  const effectiveRole = isSuperAdmin ? "admin" : role;

  const visibleItems = menuItems.filter(item => effectiveRole && item.roles.includes(effectiveRole));

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="h-auto flex flex-col items-start py-2">
            <span className="text-sm font-bold text-primary">Clube de Leça</span>
            <span className="text-xs">Reservas</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex flex-col gap-0.5 mb-2">
          <p className="text-xs font-medium truncate">{user?.email}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {role === 'admin' ? 'Administrador' : role === 'member' ? 'Operador' : role === 'direction' ? 'Direção' : 'Visitante'}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
