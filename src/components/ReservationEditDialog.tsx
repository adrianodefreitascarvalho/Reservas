import { useEffect, useState, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRooms } from "@/hooks/useRooms"; //
import { Reservation } from "@/types";

// Estendemos a interface para incluir o campo total_amount que foi adicionado recentemente
type ExtendedReservation = Reservation & { total_amount?: number };

interface Room {
  id: string;
  name: string;
}

interface ReservationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ExtendedReservation | null;
  onSave: (id: string, updates: Partial<ExtendedReservation>) => Promise<void>;
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
  const [formData, setFormData] = useState<Partial<ExtendedReservation>>({});
  const [prevReservation, setPrevReservation] = useState<ExtendedReservation | null>(null);

  // Ajustar o estado durante a renderização se a reserva mudar
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
      total_amount: Number(reservation.total_amount) || (Number(reservation.num_people || 0) * Number(reservation.menu_price || 0)) || 0,
      status: reservation.status,
    } : {});
  }

  const handleSave = () => {
    if (reservation) {
      // Filtramos os dados para garantir que o Operador não envia campos protegidos
      const updates = { ...formData };
      if (userRole !== 'admin' && userRole !== 'direction') {
        delete updates.admin_observations;
        // REMOÇÃO CRÍTICA: O Operador não pode enviar a coluna 'status' na atualização
        delete updates.status;
      }
      onSave(reservation.id, updates);
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
          <DialogTitle>{isReadOnlyForUser ? 'Detalhes da Reserva' : 'Editar Reserva'}</DialogTitle>
          <DialogDescription>
            {isReadOnlyForUser
              ? 'Visualização dos detalhes da reserva. O modo de edição está desativado para a sua categoria ou para reservas arquivadas.'
              : 'Faça as alterações necessárias nos detalhes da reserva abaixo.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Sala</Label>
            <Select value={formData.room_id} onValueChange={(v: string) => setFormData({ ...formData, room_id: v })} disabled={isReadOnlyForUser}>
              <SelectTrigger><SelectValue placeholder="Seleccione a sala" /></SelectTrigger>
              <SelectContent className="bg-white">
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
            <Input type="number" value={formData.num_people} onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const val = e.target.valueAsNumber || 0;
              const total = val * (formData.menu_price || 0);
              setFormData({ ...formData, num_people: val, total_amount: total });
            }} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Contacto</Label>
            <Input value={formData.contact} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contact: e.target.value })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Caução (€)</Label>
            <Input type="number" step="0.01" value={formData.deposit_amount} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, deposit_amount: e.target.valueAsNumber || 0 })} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Estado da Caução</Label>
            <Select value={formData.deposit_status || "pending"} onValueChange={(v: "pending" | "paid" | "returned") => setFormData({ ...formData, deposit_status: v })} disabled={isReadOnlyForUser}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
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
            <Input type="number" step="0.01" value={formData.menu_price} onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const val = e.target.valueAsNumber || 0;
              const total = (formData.num_people || 0) * val;
              setFormData({ ...formData, menu_price: val, total_amount: total });
            }} disabled={isReadOnlyForUser} />
          </div>
          <div className="space-y-2">
            <Label>Valor Total (€)</Label>
            <Input value={new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(formData.total_amount || 0)} disabled className="bg-slate-50 font-bold text-primary" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Observações (Operador)</Label>
            <Input value={formData.observations} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, observations: e.target.value })} disabled={isReadOnlyForUser} />
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