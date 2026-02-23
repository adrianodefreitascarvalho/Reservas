import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export default function AdminUsers() {
  const qc = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", role: "member" as AppRole });
  const [isCreating, setIsCreating] = useState(false);

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Usa a função segura RPC para obter utilizadores e emails
      const { data, error } = await supabase.rpc("get_users_with_roles" as any);
      if (error) throw error;
      return data as any[];
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
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Utilizador removido" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({ title: "Erro", description: "Preencha o email e a password.", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Chaves do Supabase não configuradas corretamente.");
      }

      // Criamos um cliente temporário para não fazer logout do admin atual ao criar o novo user
      const tempClient = createClient(
        supabaseUrl,
        supabaseKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }
      );

      const { data, error } = await tempClient.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            role: newUser.role // O trigger na base de dados usará isto para definir o papel
          }
        }
      });

      if (error) throw error;

      // Verifica se o utilizador já existe (Supabase retorna user falso com identities vazio se email enumeration protection estiver ativo)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("Este email já está registado no sistema.");
      }

      // Garantir que o papel é atribuído corretamente na base de dados
      if (data.user) {
        // Aguarda um momento para o trigger da BD processar (se existir)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verifica se o papel foi criado automaticamente
        const { data: roles } = await supabase.from("user_roles").select("*").eq("user_id", data.user.id);
        
        if (!roles || roles.length === 0) {
          // Se não foi criado, insere manualmente usando as permissões de Admin
          const { error: insertError } = await supabase.from("user_roles").insert({ user_id: data.user.id, role: newUser.role });
          if (insertError) throw insertError;
        } else if (roles[0].role !== newUser.role) {
          // Se foi criado mas com papel diferente (ex: default member), corrige
          const { error: updateError } = await supabase.from("user_roles").update({ role: newUser.role }).eq("id", roles[0].id);
          if (updateError) throw updateError;
        }
      }

      toast({ title: "Utilizador criado", description: "O utilizador foi registado com sucesso." });
      setIsCreateOpen(false);
      setNewUser({ email: "", password: "", role: "member" });
      
      // Atualiza a lista imediatamente
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      if (err.message?.includes("user_roles_user_id_fkey")) {
        toast({ title: "Erro ao criar", description: "Não foi possível associar o papel. O utilizador pode já existir ou houve um erro de sincronização.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao criar", description: err.message, variant: "destructive" });
      }
    } finally {
      setIsCreating(false);
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
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhum utilizador encontrado.</TableCell>
              </TableRow>
            )}
            {users?.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(v: AppRole) => updateRole.mutate({ id: u.id, role: v })}>
                    <SelectTrigger className="w-[160px]">
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
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      if (window.confirm("Tem a certeza que deseja remover o acesso deste utilizador?")) {
                        deleteUser.mutate(u.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
    </div>
  );
}
