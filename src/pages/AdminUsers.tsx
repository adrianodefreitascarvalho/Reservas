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
import { Trash2, Plus, Pencil } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { UserEditDialog } from "@/components/UserEditDialog";

type AppRole = Database["public"]["Enums"]["app_role"];

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

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Usa a função segura RPC para obter utilizadores e emails
      // @ts-expect-error A função RPC pode não estar nos tipos gerados se não forem atualizados
      const { data, error } = await supabase.rpc("get_users_with_roles");
      if (error) throw error;
      return data as unknown as UserWithRole[];
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
      // @ts-expect-error RPC function might not be in types yet
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
      // @ts-expect-error RPC function might not be in types yet
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
      // @ts-expect-error RPC function might not be in types yet
      const { error } = await supabase.rpc('create_new_user', {
        email: newUser.email,
        password: newUser.password,
        role: newUser.role
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          throw new Error("Este email já está registado no sistema.");
        }
        throw error;
      }

      toast({ title: "Utilizador criado", description: "O utilizador foi registado com sucesso." });
      setIsCreateOpen(false);
      setNewUser({ email: "", password: "", role: "member" });
      
      // Atualiza a lista imediatamente
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      const error = err as Error;
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
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
  if (isError) return <p className="text-destructive">Erro ao carregar utilizadores: {(error as Error).message}. Verifique se a função 'get_users_with_roles' foi criada na base de dados.</p>;

  const ROLE_LABELS: Record<string, string> = { admin: "Administrador", member: "Operador", direction: "Direcção" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestão de Utilizadores</h2>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Utilizador
        </Button>
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
            {users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhum utilizador encontrado.</TableCell>
              </TableRow>
            )}
            {users?.map((u) => (
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
