import { useState } from "react";
import { useRooms, useCreateRoom, useUpdateRoom } from "@/hooks/useRooms";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil } from "lucide-react";

interface Room {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  max_capacity: number | null;
}

export default function AdminRooms() {
  const { data: rooms, isLoading } = useRooms();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const [dialog, setDialog] = useState<{ open: boolean; mode: "create" | "edit"; room?: Room }>({ open: false, mode: "create" });
  const [form, setForm] = useState({ name: "", description: "", color: "#3B82F6", max_capacity: 0 });

  const openCreate = () => {
    setForm({ name: "", description: "", color: "#3B82F6", max_capacity: 0 });
    setDialog({ open: true, mode: "create" });
  };

  const openEdit = (room: Room) => {
    setForm({ name: room.name, description: room.description ?? "", color: room.color, max_capacity: room.max_capacity ?? 0 });
    setDialog({ open: true, mode: "edit", room });
  };

  const handleSave = async () => {
    try {
      if (dialog.mode === "create") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await createRoom.mutateAsync(form as any);
        toast({ title: "Sala criada" });
      } else {
        if (!dialog.room) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await updateRoom.mutateAsync({ id: dialog.room.id, ...form } as any);
        toast({ title: "Sala atualizada" });
      }
      setDialog({ open: false, mode: "create" });
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
    }
  };

  const toggleActive = async (room: Room) => {
    try {
      await updateRoom.mutateAsync({ id: room.id, is_active: !room.is_active });
      toast({ title: room.is_active ? "Sala desativada" : "Sala ativada" });
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (isLoading) return <p className="text-muted-foreground">A carregar...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestão de Salas</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nova Sala
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cor</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Capacidade Máxima</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms?.map(r => (
              <TableRow key={r.id} className={!r.is_active ? "opacity-50" : ""}>
                <TableCell>
                  <div
                    className="h-6 w-6 rounded-full border"
                    ref={(el) => {
                      if (el) el.style.backgroundColor = r.color;
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell>{r.max_capacity != null ? `${r.max_capacity} pax` : "-"}</TableCell>
                <TableCell>
                  <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialog.open} onOpenChange={open => setDialog(d => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "Nova Sala" : "Editar Sala"}</DialogTitle>
            <DialogDescription>Preencha os dados da sala</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Capacidade Máxima (Max Pax)</Label>
              <Input type="number" min={0} value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: parseInt(e.target.value) || 0 }))} placeholder="Nº de pessoas" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <Input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-16 h-10 p-1" />
                <span className="text-sm text-muted-foreground">{form.color}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!form.name || createRoom.isPending || updateRoom.isPending}>
              {dialog.mode === "create" ? "Criar" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
