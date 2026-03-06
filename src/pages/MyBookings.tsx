import { useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useMyReservations, useUpdateReservation } from "@/hooks/useReservations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Reservation } from "@/types";
import { ReservationEditDialog } from "@/components/ReservationEditDialog";
import { Pencil } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmada", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800" },
};

export default function MyBookings() {
  const { user, role } = useAuth();
  const { data: reservations, isLoading } = useMyReservations(user?.id) as { data: Reservation[], isLoading: boolean };
  const updateReservation = useUpdateReservation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const handleCancel = async (id: string) => {
    try {
      await updateReservation.mutateAsync({ id, status: "cancelled" });
      toast({ title: "Reserva cancelada" });
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
    }
  };

  const openEdit = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (id: string, updates: Partial<Reservation>) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateReservation.mutateAsync({ id, ...updates } as any);
      toast({ title: "Reserva atualizada" });
      setIsEditOpen(false);
    } catch (err) {
      toast({ title: "Erro ao guardar", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (isLoading) return <p className="text-muted-foreground">A carregar...</p>;


  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">As Minhas Reservas</h2>
      {!reservations?.length ? (
        <p className="text-muted-foreground">Ainda não tem reservas.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sala</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full border bg-[${r.rooms?.color ?? 'transparent'}]`} />
                      {r.rooms?.name}
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(r.date + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{r.start_time?.slice(0, 5)} - {r.end_time?.slice(0, 5)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_MAP[r.status]?.className}>
                      {STATUS_MAP[r.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "pending" && (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleCancel(r.id)} disabled={updateReservation.isPending}>
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    </div>
  );
}
