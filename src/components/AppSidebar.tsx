import { Calendar, Plus, List, Settings, Users, DoorOpen, LogOut, Archive, BarChart3, ChevronDown, DollarSign } from "lucide-react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function AppSidebar() {
  const { role, user, signOut } = useAuth();

  const menuItems = [
    { title: "Calendário", url: "/calendar", icon: Calendar, roles: ["admin", "member", "direction"] },
    { title: "Nova Reserva", url: "/bookings/new", icon: Plus, roles: ["admin", "member"] },
    { title: "As Minhas Reservas", url: "/my-bookings", icon: List, roles: ["admin", "member"] },
    { title: "Gestão de Reservas", url: "/admin", icon: Settings, roles: ["admin", "direction", "member"] },
    { 
      title: "Estatísticas", 
      url: "/statistics", 
      icon: BarChart3, 
      roles: ["admin", "direction"],
      children: [{ title: "Receitas", url: "/statistics/receipts", icon: DollarSign }]
    },
    { title: "Reservas Arquivadas", url: "/admin/archived", icon: Archive, roles: ["admin", "direction", "member"] },
    { title: "Gestão de Salas", url: "/admin/rooms", icon: DoorOpen, roles: ["admin"] },
    { title: "Gestão de Utilizadores", url: "/admin/users", icon: Users, roles: ["admin"] },
  ];

  const visibleItems = menuItems.filter(item => role && item.roles.includes(role));

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
                item.children ? (
                  <Collapsible key={item.url} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.url}>
                              <SidebarMenuSubButton asChild>
                                <NavLink to={child.url} className="hover:bg-sidebar-accent" activeClassName="text-sidebar-primary font-medium">
                                  <child.icon className="mr-2 h-4 w-4" />
                                  <span>{child.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink to={item.url} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
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
