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
import { Pencil, Archive, Eye } from "lucide-react";
import { Reservation } from "@/types";
import { ReservationEditDialog } from "@/components/ReservationEditDialog";

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

interface AdminReservationsProps {
  archivedOnly?: boolean;
}

export default function AdminReservations({ archivedOnly = false }: AdminReservationsProps) {
  const qc = useQueryClient();
  const { role, user } = useAuth();
  const isDirection = role === 'direction';
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const { data: rooms } = useRooms();
  const { data: rawReservations, isLoading, isError, error } = useReservations({
    status: archivedOnly ? "archived" : (statusFilter !== "all" ? statusFilter : undefined),
    room_id: roomFilter !== "all" ? roomFilter : undefined,
  }) as { data: Reservation[] | undefined; isLoading: boolean; isError: boolean; error: Error | null };

  const reservations = rawReservations?.filter((r: Reservation) => {
    if (archivedOnly) return true;
    if (statusFilter === "all") return r.status !== "archived";
    return true;
  });

  const updateReservation = useUpdateReservation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
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
    setSelectedReservation(reservation);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (id: string, updates: Partial<Reservation>) => {
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


  if (isError) return <div className="p-6 text-destructive">Erro ao carregar reservas: {error?.message}</div>;

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
              <SelectContent className="bg-white">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="confirmed">Confirmadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="w-45"><SelectValue placeholder="Sala" /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">Todas as salas</SelectItem>
                {rooms?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            </div>
            {!isDirection && (
              <Button variant="outline" onClick={() => setIsArchiveOpen(true)}>
                <Archive className="mr-2 h-4 w-4" />
                Arquivar
              </Button>
            )}
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
                  {reservations?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma reserva encontrada.</TableCell>
                    </TableRow>
                  )}
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
                            {isDirection ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <Pencil className="h-4 w-4" />
                            )}
                          </Button>
                          {!archivedOnly && r.status !== 'archived' && !isDirection && (
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
                  {openDeposits.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma caução pendente.</TableCell>
                    </TableRow>
                  )}
                  {openDeposits.map((r: Reservation) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.rooms?.name}</TableCell>
                    <TableCell>{format(new Date(r.date + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{r.responsible_name}</TableCell>
                    <TableCell>{r.deposit_amount}€</TableCell>
                    <TableCell>
                      {r.deposit_status === "pending" ? !isDirection && (
                        <Button size="sm" variant="outline" onClick={() => handleAction(r.id, { deposit_status: "paid" })}>
                          Marcar Pago
                        </Button>
                      ) : (
                        !isDirection && <Button size="sm" variant="outline" onClick={() => handleAction(r.id, { deposit_status: "returned" })}>
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
              <SelectContent className="bg-white">
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
                          {isDirection ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <Pencil className="h-4 w-4" />
                          )}
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

      <ReservationEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        reservation={selectedReservation}
        onSave={handleSaveEdit}
        userRole={role}
        isSaving={updateReservation.isPending}
      />

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
