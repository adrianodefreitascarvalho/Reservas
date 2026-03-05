import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRooms } from "@/hooks/useRooms";
import { useCreateReservation } from "@/hooks/useReservations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

export default function NewBooking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: rooms } = useRooms(true);
  const createReservation = useCreateReservation();

  const [form, setForm] = useState({
    room_id: "",
    date: "",
    start_time: "",
    end_time: "",
    responsible_name: "",
    event_type: "",
    num_people: 1,
    contact: "",
    deposit_amount: 0,
    deposit_status: "pending" as Database["public"]["Enums"]["deposit_status"],
    menu_choice: "",
    observations: "",
    menu_price: 0,
  });
  const [checking, setChecking] = useState(false);
  const [conflict, setConflict] = useState(false);

  const checkOverlap = async () => {
    if (!form.room_id || !form.date || !form.start_time || !form.end_time) return;
    setChecking(true);
    const { data } = await supabase
      .from("reservations")
      .select("id")
      .eq("room_id", form.room_id)
      .eq("date", form.date)
      .neq("status", "cancelled")
      .lt("start_time", form.end_time)
      .gt("end_time", form.start_time);
    setConflict(!!(data && data.length > 0));
    setChecking(false);
  };

  const update = (field: string, value: string | number) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (["room_id", "date", "start_time", "end_time"].includes(field)) {
      setTimeout(() => {
        if (next.room_id && next.date && next.start_time && next.end_time) {
          checkOverlap();
        }
      }, 0);
    }
  };

  const selectedRoom = rooms?.find(r => r.id === form.room_id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxCapacity = (selectedRoom as any)?.max_capacity;
  const capacityExceeded = maxCapacity && form.num_people > maxCapacity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (conflict) {
      toast({ title: "Conflito de horário", description: "Já existe uma reserva neste horário.", variant: "destructive" });
      return;
    }
    if (capacityExceeded) {
      toast({ title: "Capacidade excedida", description: `A capacidade máxima desta sala é de ${maxCapacity} pessoas.`, variant: "destructive" });
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createReservation.mutateAsync({ ...form, user_id: user.id } as any);
      toast({ title: "Reserva criada!", description: "A reserva foi submetida em estado pendente." });
      navigate("/my-bookings");
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nova Reserva</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sala</Label>
              <Select value={form.room_id} onValueChange={v => update("room_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione a sala" /></SelectTrigger>
                <SelectContent>
                  {rooms?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={e => update("date", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Hora Início</Label>
              <Input type="time" value={form.start_time} onChange={e => update("start_time", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Hora Fim</Label>
              <Input type="time" value={form.end_time} onChange={e => update("end_time", e.target.value)} required />
            </div>
          </div>

          {conflict && (
            <p className="text-sm text-destructive font-medium">⚠️ Já existe uma reserva neste horário para esta sala.</p>
          )}
          {capacityExceeded && (
            <p className="text-sm text-destructive font-medium">⚠️ A capacidade máxima desta sala é de {maxCapacity} pessoas.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Responsável</Label>
              <Input value={form.responsible_name} onChange={e => update("responsible_name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Evento</Label>
              <Input value={form.event_type} onChange={e => update("event_type", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Número de Pessoas</Label>
              <Input type="number" min={1} value={form.num_people} onChange={e => update("num_people", parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-2">
              <Label>Contacto</Label>
              <Input value={form.contact} onChange={e => update("contact", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor da Caução (€)</Label>
              <Input type="number" min={0} step={0.01} value={form.deposit_amount} onChange={e => update("deposit_amount", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Estado da Caução</Label>
              <Select value={form.deposit_status} onValueChange={v => update("deposit_status", v)}>
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
              <Input value={form.menu_choice} onChange={e => update("menu_choice", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor de Menu (€)</Label>
              <Input type="number" min={0} step={0.01} value={form.menu_price} onChange={e => update("menu_price", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Input value={form.observations} onChange={e => update("observations", e.target.value)} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={createReservation.isPending || conflict || capacityExceeded}>
            {createReservation.isPending ? "A submeter..." : "Submeter Reserva"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
