import { useState, type ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Tipo base para um utilizador, conforme o seu plano
interface User {
  id: string;
  email?: string;
  role?: 'admin' | 'member' | 'direction';
}

// Dados do formulário, incluindo uma possível nova password
type UserFormData = Partial<User> & { password?: string };

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null; // null para criar, objeto User para editar
  onSave: (id: string | null, updates: UserFormData) => Promise<void>;
  isSaving?: boolean;
}

export function UserEditDialog({
  open,
  onOpenChange,
  user,
  onSave,
  isSaving = false
}: UserEditDialogProps) {
  const [formData, setFormData] = useState<UserFormData>(() => ({
    id: user?.id,
    email: user?.email || "",
    role: user?.role || "member",
    password: "" 
  }));

  const isEditing = !!user;

  const handleSave = () => {
    onSave(user?.id || null, formData);
  };

  const title = isEditing ? "Editar Utilizador" : "Criar Novo Utilizador";
  const description = isEditing
    ? "Altere a categoria ou a password do utilizador."
    : "Preencha os dados para criar um novo utilizador.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="nome@exemplo.com" value={formData.email || ""} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })} disabled={isEditing} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={formData.password || ""} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })} placeholder={isEditing ? "Deixar em branco para não alterar" : "Defina uma password"} />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={formData.role || "member"} onValueChange={(v: string) => setFormData({ ...formData, role: v as 'admin' | 'member' | 'direction' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                <SelectItem value="direction">{ROLE_LABELS.direction}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "A Guardar..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}