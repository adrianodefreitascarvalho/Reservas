import { useEffect, useState, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRooms } from "@/hooks/useRooms"; //
import { Reservation } from "@/types";

// Definido localmente, pois 'Room' não está exportado de '@/types'
interface Room {
  id: string;
  name: string;
}

interface ReservationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation | null;
  onSave: (id: string, updates: Partial<Reservation>) => Promise<void>;
  userRole?: string | null;
  isSaving?: boolean;
}

export function ReservationEditDialog({ 
  open, 
  onOpenChange, 
  reservation, 
  onSave, 
  userRole,
  isSaving = false 
}: ReservationEditDialogProps) {
  const { data: rooms } = useRooms();
  const [formData, setFormData] = useState<Partial<Reservation>>({});
  const [prevReservation, setPrevReservation] = useState<Reservation | null>(null);

  // Sincronização de estado correta sem useEffect para evitar loops de render
  if (reservation !== prevReservation) {
    setPrevReservation(reservation);
    setFormData(reservation ? {
      room_id: reservation.room_id,
      date: reservation.date,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      responsible_name: reservation.responsible_name,
      event_type: reservation.event_type || "",
      num_people: reservation.num_people || 1,
      contact: reservation.contact || "",
      deposit_amount: Number(reservation.deposit_amount) || 0,
      deposit_status: reservation.deposit_status || "pending",
      menu_choice: reservation.menu_choice || "",
      menu_price: Number(reservation.menu_price) || 0,
      observations: reservation.observations || "",
      admin_observations: reservation.admin_observations || "",
      status: reservation.status,
    } : {});
  }

  const handleSave = () => {
    if (reservation) {
      onSave(reservation.id, formData);
    }
  };

  const isArchived = formData.status === 'archived';
  const isAdmin = userRole === 'admin';
  const isDirection = userRole === 'direction';

  const isReadOnlyForUser = isArchived || isDirection;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isArchived ? 'Detalhes da Reserva' : 'Editar Reserva'}</DialogTitle>
          <DialogDescription>
            {isArchived
              ? 'Visualização dos detalhes de uma reserva arquivada. Não é possível editar.'
              : 'Faça as alterações necessárias nos detalhes da reserva abaixo.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Sala</Label>
            <Select value={formData.room_id} onValueChange={(v: string) => setFormData({ ...formData, room_id: v })} disabled={isReadOnlyForUser}>
              <SelectTrigger><SelectValue placeholder="Seleccione a sala" /></SelectTrigger>
              <SelectContent>
                {rooms?.map((r: Room) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={formData.date} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Hora Início</Label>
            <Input type="time" value={formData.start_time} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, start_time: e.target.value })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Hora Fim</Label>
            <Input type="time" value={formData.end_time} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, end_time: e.target.value })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input value={formData.responsible_name} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, responsible_name: e.target.value })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <Input value={formData.event_type} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, event_type: e.target.value })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Nº Pessoas</Label>
            <Input type="number" value={formData.num_people} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, num_people: parseInt(e.target.value) || 0 })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Contacto</Label>
            <Input value={formData.contact} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contact: e.target.value })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Caução (€)</Label>
            <Input type="number" step="0.01" value={formData.deposit_amount} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, deposit_amount: parseFloat(e.target.value) || 0 })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Estado da Caução</Label>
            <Select value={formData.deposit_status || "pending"} onValueChange={(v: "pending" | "paid" | "returned") => setFormData({ ...formData, deposit_status: v })} disabled={isArchived || !isAdmin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Não Paga</SelectItem>
                <SelectItem value="paid">Paga</SelectItem>
                <SelectItem value="returned">Devolvida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Menu Contratado</Label>
            <Input value={formData.menu_choice} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, menu_choice: e.target.value })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Valor Menu (€)</Label>
            <Input type="number" step="0.01" value={formData.menu_price} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, menu_price: parseFloat(e.target.value) || 0 })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Observações (Operador)</Label>
            <Input value={formData.observations} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, observations: e.target.value })} disabled={isArchived || isAdmin} />
          </div>
          {(isAdmin || isDirection) && (
            <div className="space-y-2 md:col-span-2">
              <Label>Observações (Admin)</Label>
              <Input value={formData.admin_observations} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, admin_observations: e.target.value })} disabled={isReadOnlyForUser} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isArchived ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isReadOnlyForUser && (
            <Button onClick={handleSave} disabled={isSaving}>Guardar Alterações</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}