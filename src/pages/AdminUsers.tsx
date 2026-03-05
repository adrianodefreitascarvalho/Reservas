import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Pencil, Search } from "lucide-react";
import { UserEditDialog } from "@/components/UserEditDialog";

type AppRole = "admin" | "member" | "direction";

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  role: AppRole;
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const { user: adminUser } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", role: "member" as AppRole });
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select(`
        id,
        user_id,
        role,
        users ( email )
      `);

      if (error) {
        if (error.code === "42501") {
          // permission denied
          throw new Error("Acesso negado. Verifique as políticas de RLS para 'user_roles' e 'auth.users'.");
        }
        throw error;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any[]).map((u) => ({
        id: u.id, user_id: u.user_id, role: u.role, email: u.users?.email || "Email não encontrado",
      })) as UserWithRole[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Papel atualizado" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userIdToDelete: string) => {
      const { error } = await supabase.rpc('delete_user', { target_user_id: userIdToDelete });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Utilizador removido com sucesso" });
    },
    onError: (err: Error) => {
      const error = err as Error;
      if (error.message?.includes("User not found")) {
        toast({ title: "Erro", description: "Utilizador não encontrado na autenticação. A conta pode já ter sido removida.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
      }
    },
  });

  const updateUserPassword = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { error } = await supabase.rpc('update_user_password', { 
        target_user_id: userId, 
        new_password: password 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Password atualizada com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar password", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({ title: "Erro", description: "Preencha o email e a password.", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      // 1. Criar um cliente temporário para não fazer logout do admin atual
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false, // Não guardar sessão no browser
            detectSessionInUrl: false
          }
        }
      );

      // 2. Criar o utilizador usando a API oficial (cria corretamente auth.users e auth.identities)
      const { error: signUpError } = await tempClient.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (signUpError) throw signUpError;

      // 3. Confirmar o email e definir o papel usando a nossa função segura de admin
      const { error: confirmError } = await supabase.rpc('admin_confirm_user', {
        target_email: newUser.email,
        target_role: newUser.role
      });

      if (confirmError) throw confirmError;

      toast({ title: "Utilizador criado", description: "O utilizador foi registado e confirmado com sucesso." });
      setIsCreateOpen(false);
      setNewUser({ email: "", password: "", role: "member" });
      
      // Atualiza a lista imediatamente
      qc.invalidateQueries({ queryKey: ["admin-users"] });

    } catch (err) {
      const error = err as Error;
        // Trata erros específicos da função RPC e do Supabase
        if (error.message.includes("User already registered") || error.message.includes("Este email já está registado")) {
          toast({ title: "Erro ao criar", description: "Este email já está registado no sistema.", variant: "destructive" });
        } else {
          toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        }
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setIsEditOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveUser = async (id: string | null, updates: any) => {
    if (!id || !editingUser) return;

    try {
      if (updates.role && updates.role !== editingUser.role) {
        await updateRole.mutateAsync({ id, role: updates.role });
      }

      if (updates.password && updates.password.trim() !== "") {
        await updateUserPassword.mutateAsync({ userId: editingUser.user_id, password: updates.password });
      }

      setIsEditOpen(false);
      setEditingUser(null);
    } catch (error) {
      // Errors are handled in mutations
    }
  };

  if (isLoading) return <p className="text-muted-foreground">A carregar...</p>;
  if (isError)
    return (
      <p className="text-destructive">Erro ao carregar utilizadores: {(error as Error).message}</p>
    );

  const ROLE_LABELS: Record<string, string> = { admin: "Administrador", member: "Operador", direction: "Direcção" };

  const filteredUsers = users?.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ROLE_LABELS[u.role] || u.role).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold whitespace-nowrap">Gestão de Utilizadores</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Utilizador
        </Button>
        </div>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="w-25">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhum utilizador encontrado.</TableCell>
              </TableRow>
            )}
            {filteredUsers?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(v) => updateRole.mutate({ id: u.id, role: v as AppRole })}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                      <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
                      <SelectItem value="direction">{ROLE_LABELS.direction}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => handleEditUser(u)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      if (window.confirm("Tem a certeza que deseja remover este utilizador? Esta ação é irreversível e irá apagar permanentemente a conta.")) {
                        // Assumimos que a RPC `get_users_with_roles` retorna `user_id` que é o ID de `auth.users`
                        deleteUser.mutate(u.user_id);
                      }
                    }}
                    // Impede que o administrador se apague a si mesmo
                    disabled={adminUser?.id === u.user_id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Utilizador</DialogTitle>
            <DialogDescription>Crie uma conta para um novo utilizador do sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={newUser.role} onValueChange={(v: AppRole) => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                  <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
                  <SelectItem value="direction">{ROLE_LABELS.direction}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>
              {isCreating ? "A criar..." : "Criar Utilizador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserEditDialog
        key={editingUser?.id}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        user={editingUser}
        onSave={handleSaveUser}
        isSaving={updateRole.isPending || updateUserPassword.isPending}
      />
    </div>
  );
}
