import { useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReservations, useUpdateReservation } from "@/hooks/useReservations";
import { useRooms } from "@/hooks/useRooms";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Pencil, Archive } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmada", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800" },
  archived: { label: "Arquivada", className: "bg-gray-100 text-gray-800" },
};

const DEPOSIT_MAP: Record<string, string> = {
  pending: "Não Paga",
  paid: "Paga",
  returned: "Devolvida",
};

interface Reservation {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  responsible_name: string;
  event_type?: string;
  num_people?: number;
  contact?: string;
  deposit_amount?: number;
  deposit_status: "pending" | "paid" | "returned";
  menu_choice?: string;
  menu_price?: number;
  observations?: string;
  admin_observations?: string;
  status: "pending" | "confirmed" | "cancelled" | "archived";
  rooms?: { name: string };
}

interface AdminReservationsProps {
  archivedOnly?: boolean;
}

export default function AdminReservations({ archivedOnly = false }: AdminReservationsProps) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const { data: rooms } = useRooms();
  const { data: rawReservations, isLoading } = useReservations({
    status: archivedOnly ? "archived" : (statusFilter !== "all" ? statusFilter : undefined),
    room_id: roomFilter !== "all" ? roomFilter : undefined,
  }) as { data: Reservation[] | undefined; isLoading: boolean };

  const reservations = rawReservations?.filter((r: Reservation) => {
    if (archivedOnly) return true;
    if (statusFilter === "all") return r.status !== "archived";
    return true;
  });

  const updateReservation = useUpdateReservation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Reservation>>({ deposit_status: "pending" });
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveDates, setArchiveDates] = useState({ start: "", end: "" });

  const handleAction = async (id: string, updates: Partial<Reservation>) => {
    try {
      // The 'archived' status might not be in the DB schema, so we cast to 'any' to bypass the TS check.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateReservation.mutateAsync({ id, ...updates } as any);
      toast({ title: "Reserva actualizada" });
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
    }
  };

  const openEdit = (reservation: Reservation) => {
    setEditForm({
      id: reservation.id,
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
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    // Remove o ID dos dados a atualizar para evitar erro de chave primária
    const { id, ...updates } = editForm;
    await handleAction(id, updates);
    setIsEditOpen(false);
  };

  const handleArchive = async () => {
    if (!archiveDates.start || !archiveDates.end) {
      toast({ title: "Erro", description: "Seleccione as datas de início e fim.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("reservations")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ status: "archived" } as any)
        .gte("date", archiveDates.start)
        .lte("date", archiveDates.end)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .neq("status", "archived" as any);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Reservas arquivadas com sucesso." });
      setIsArchiveOpen(false);
      qc.invalidateQueries({ queryKey: ["reservations"] });
    } catch (err) {
      toast({ title: "Erro ao arquivar", description: (err as Error).message, variant: "destructive" });
    }
  };

  const openDeposits = reservations?.filter((r: Reservation) => (r.deposit_status === "paid" || r.deposit_status === "pending") && r.status !== "cancelled" && Number(r.deposit_amount) > 0) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{archivedOnly ? "Reservas Arquivadas" : "Gestão de Reservas"}</h2>

      {!archivedOnly ? (
      <Tabs defaultValue="reservations">
        <TabsList>
          <TabsTrigger value="reservations">Reservas</TabsTrigger>
          <TabsTrigger value="deposits">Cauções em Aberto ({openDeposits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="reservations" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="confirmed">Confirmadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="w-45"><SelectValue placeholder="Sala" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as salas</SelectItem>
                {rooms?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            </div>
            <Button variant="outline" onClick={() => setIsArchiveOpen(true)}>
              <Archive className="mr-2 h-4 w-4" />
              Arquivar
            </Button>
          </div>

          {isLoading ? <p className="text-muted-foreground">A carregar...</p> : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sala</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Caução</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations?.map((r: Reservation) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.rooms?.name}</TableCell>
                      <TableCell>{format(new Date(r.date + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{r.start_time?.slice(0, 5)} - {r.end_time?.slice(0, 5)}</TableCell>
                      <TableCell>{r.responsible_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_MAP[r.status]?.className}>
                          {STATUS_MAP[r.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.deposit_amount}€ ({DEPOSIT_MAP[r.deposit_status]})</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!archivedOnly && r.status !== 'archived' && (
                            <>
                              {r.status === "pending" && (
                                <Button size="sm" onClick={() => handleAction(r.id, { status: "confirmed" })}>Confirmar</Button>
                              )}
                              {r.status !== "cancelled" && (
                                <Button size="sm" variant="destructive" onClick={() => handleAction(r.id, { status: "cancelled" })}>Cancelar</Button>
                              )}
                              {r.deposit_status === "paid" && (
                                <Button size="sm" variant="outline" onClick={() => handleAction(r.id, { deposit_status: "returned" })}>Devolver Caução</Button>
                              )}
                              {r.deposit_status === "pending" && r.deposit_amount > 0 && (
                                <Button size="sm" variant="outline" onClick={() => handleAction(r.id, { deposit_status: "paid" })}>Marcar Pago</Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="deposits">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sala</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {openDeposits.map((r: Reservation) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.rooms?.name}</TableCell>
                    <TableCell>{format(new Date(r.date + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{r.responsible_name}</TableCell>
                    <TableCell>{r.deposit_amount}€</TableCell>
                    <TableCell>
                      {r.deposit_status === "pending" ? (
                        <Button size="sm" variant="outline" onClick={() => handleAction(r.id, { deposit_status: "paid" })}>
                          Marcar Pago
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleAction(r.id, { deposit_status: "returned" })}>
                          Devolver Caução
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="w-45"><SelectValue placeholder="Sala" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as salas</SelectItem>
                {rooms?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <p className="text-muted-foreground">A carregar...</p> : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sala</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Caução</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations?.map((r: Reservation) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.rooms?.name}</TableCell>
                      <TableCell>{format(new Date(r.date + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{r.start_time?.slice(0, 5)} - {r.end_time?.slice(0, 5)}</TableCell>
                      <TableCell>{r.responsible_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_MAP[r.status]?.className}>
                          {STATUS_MAP[r.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.deposit_amount}€ ({DEPOSIT_MAP[r.deposit_status]})</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editForm.status === 'archived' ? 'Detalhes da Reserva' : 'Editar Reserva'}</DialogTitle>
            <DialogDescription>
              {editForm.status === 'archived'
                ? 'Visualização dos detalhes de uma reserva arquivada. Não é possível editar.'
                : 'Faça as alterações necessárias nos detalhes da reserva abaixo.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Sala</Label>
              <Select value={editForm.room_id} onValueChange={v => setEditForm({ ...editForm, room_id: v })} disabled={editForm.status === 'archived'}>
                <SelectTrigger><SelectValue placeholder="Seleccione a sala" /></SelectTrigger>
                <SelectContent>
                  {rooms?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} disabled={editForm.status === 'archived'} />
            </div>
            <div className="space-y-2">
              <Label>Hora Início</Label>
              <Input type="time" value={editForm.start_time} onChange={e => setEditForm({ ...editForm, start_time: e.target.value })} disabled={editForm.status === 'archived'} />
            </div>
            <div className="space-y-2">
              <Label>Hora Fim</Label>
              <Input type="time" value={editForm.end_time} onChange={e => setEditForm({ ...editForm, end_time: e.target.value })} disabled={editForm.status === 'archived'} />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={editForm.responsible_name} onChange={e => setEditForm({ ...editForm, responsible_name: e.target.value })} disabled={editForm.status === 'archived'} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Evento</Label>
              <Input value={editForm.event_type} onChange={e => setEditForm({ ...editForm, event_type: e.target.value })} disabled={editForm.status === 'archived'} />
            </div>
            <div className="space-y-2">
              <Label>Nº Pessoas</Label>
              <Input type="number" value={editForm.num_people} onChange={e => setEditForm({ ...editForm, num_people: parseInt(e.target.value) || 0 })} disabled={editForm.status === 'archived'} />
            </div>
            <div className="space-y-2">
              <Label>Contacto</Label>
              <Input value={editForm.contact} onChange={e => setEditForm({ ...editForm, contact: e.target.value })} disabled={editForm.status === 'archived'} />
            </div>
            <div className="space-y-2">
              <Label>Caução (€)</Label>
              <Input type="number" step="0.01" value={editForm.deposit_amount} onChange={e => setEditForm({ ...editForm, deposit_amount: parseFloat(e.target.value) || 0 })} disabled={editForm.status === 'archived'} />
            </div>
            <div className="space-y-2">
              <Label>Estado da Caução</Label>
              <Select value={editForm.deposit_status || "pending"} onValueChange={v => setEditForm({ ...editForm, deposit_status: v as "pending" | "paid" | "returned" })} disabled={editForm.status === 'archived'}>
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
              <Input value={editForm.menu_choice} onChange={e => setEditForm({ ...editForm, menu_choice: e.target.value })} disabled={editForm.status === 'archived'} />
            </div>
            <div className="space-y-2">
              <Label>Valor Menu (€)</Label>
              <Input type="number" step="0.01" value={editForm.menu_price} onChange={e => setEditForm({ ...editForm, menu_price: parseFloat(e.target.value) || 0 })} disabled={editForm.status === 'archived'} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observações (Operador)</Label>
              <Input value={editForm.observations} onChange={e => setEditForm({ ...editForm, observations: e.target.value })} disabled={editForm.status === 'archived' || role === 'admin'} />
            </div>
            {(role === 'admin' || role === 'direction') && (
              <div className="space-y-2 md:col-span-2">
                <Label>Observações (Admin)</Label>
                <Input value={editForm.admin_observations} onChange={e => setEditForm({ ...editForm, admin_observations: e.target.value })} disabled={editForm.status === 'archived'} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {editForm.status === 'archived' ? 'Fechar' : 'Cancelar'}
            </Button>
            {editForm.status !== 'archived' && (
              <Button onClick={handleSaveEdit} disabled={updateReservation.isPending}>Guardar Alterações</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar Reservas</DialogTitle>
            <DialogDescription>
              Selecione o intervalo de datas para arquivar as reservas. As reservas arquivadas mudarão de estado para "Arquivada".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={archiveDates.start} onChange={e => setArchiveDates({ ...archiveDates, start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={archiveDates.end} onChange={e => setArchiveDates({ ...archiveDates, end: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveOpen(false)}>Cancelar</Button>
            <Button onClick={handleArchive}>Arquivar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
