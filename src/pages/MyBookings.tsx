import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useMyReservations, useUpdateReservation } from "@/hooks/useReservations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmada", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800" },
};

export default function MyBookings() {
  const { user } = useAuth();
  const { data: reservations, isLoading } = useMyReservations(user?.id);
  const updateReservation = useUpdateReservation();

  const handleCancel = async (id: string) => {
    try {
      await updateReservation.mutateAsync({ id, status: "cancelled" });
      toast({ title: "Reserva cancelada" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
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
              {reservations.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: r.rooms?.color }} />
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
                      <Button variant="destructive" size="sm" onClick={() => handleCancel(r.id)} disabled={updateReservation.isPending}>
                        Cancelar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
