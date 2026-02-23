import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import { pt } from "date-fns/locale";
import { useReservations } from "@/hooks/useReservations";
import { useRooms } from "@/hooks/useRooms";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  confirmed: { label: "Confirmada", className: "bg-green-100 text-green-800 border-green-300" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800 border-red-300" },
  archived: { label: "Arquivada", className: "bg-gray-100 text-gray-800 border-gray-300" },
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  const { data: rooms } = useRooms();

  const dateRange = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(currentDate), { locale: pt });
      const end = endOfWeek(endOfMonth(currentDate), { locale: pt });
      return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd"), days: eachDayOfInterval({ start, end }) };
    } else {
      const start = startOfWeek(currentDate, { locale: pt });
      const end = endOfWeek(currentDate, { locale: pt });
      return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd"), days: eachDayOfInterval({ start, end }) };
    }
  }, [currentDate, view]);

  const { data: reservations } = useReservations({
    date_from: dateRange.from,
    date_to: dateRange.to,
    room_id: roomFilter !== "all" ? roomFilter : undefined,
  });

  const navigate = (dir: number) => {
    if (view === "month") setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const dayReservations = (day: Date) =>
    reservations?.filter((r: any) => isSameDay(new Date(r.date + "T00:00:00"), day) && r.status !== "cancelled") ?? [];
    reservations?.filter((r: any) => isSameDay(new Date(r.date + "T00:00:00"), day) && r.status !== "cancelled" && r.status !== "archived") ?? [];

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold capitalize min-w-[200px] text-center">
            {view === "month"
              ? format(currentDate, "MMMM yyyy", { locale: pt })
              : `Semana de ${format(dateRange.days[0], "d MMM", { locale: pt })}`}
          </h2>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={roomFilter} onValueChange={setRoomFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as salas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as salas</SelectItem>
              {rooms?.filter(r => r.is_active).map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tabs value={view} onValueChange={v => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-muted">
          {weekDays.map(d => (
            <div key={d} className="py-2 text-center text-sm font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className={`grid grid-cols-7 ${view === "week" ? "min-h-[200px]" : ""}`}>
          {dateRange.days.map((day, i) => {
            const dayRes = dayReservations(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);
            return (
              <div
                key={i}
                className={`border-t border-r p-1 min-h-[80px] ${view === "week" ? "min-h-[150px]" : ""} ${!isCurrentMonth && view === "month" ? "bg-muted/40" : ""}`}
              >
                <span className={`text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : !isCurrentMonth ? "text-muted-foreground" : ""}`}>
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayRes.slice(0, 3).map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReservation(r)}
                      className={`w-full text-left text-xs px-1 py-0.5 rounded truncate block border-l-4 ${STATUS_LABELS[r.status]?.className || ""}`}
                    >
                      {r.start_time?.slice(0, 5)} {r.rooms?.name} ({STATUS_LABELS[r.status]?.label})
                    </button>
                  ))}
                  {dayRes.length > 3 && (
                    <span className="text-xs text-muted-foreground pl-1">+{dayRes.length - 3} mais</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Room Legend */}
      <div className="flex flex-wrap gap-3">
        {rooms?.filter(r => r.is_active).map(r => (
          <div key={r.id} className="flex items-center gap-1.5 text-sm">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color }} />
            <span>{r.name}</span>
          </div>
        ))}
        <div className="ml-4 flex gap-3">
          {Object.entries(STATUS_LABELS).map(([key, val]) => (
            <Badge key={key} variant="outline" className={val.className}>{val.label}</Badge>
          ))}
        </div>
      </div>

      {/* Reservation Detail Dialog */}
      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Reserva</DialogTitle>
            <DialogDescription>Informações sobre a reserva selecionada</DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="font-medium">Sala:</span> {selectedReservation.rooms?.name}</div>
                <div><span className="font-medium">Data:</span> {format(new Date(selectedReservation.date + "T00:00:00"), "dd/MM/yyyy")}</div>
                <div><span className="font-medium">Horário:</span> {selectedReservation.start_time?.slice(0, 5)} - {selectedReservation.end_time?.slice(0, 5)}</div>
                <div><span className="font-medium">Responsável:</span> {selectedReservation.responsible_name}</div>
                <div><span className="font-medium">Evento:</span> {selectedReservation.event_type}</div>
                <div><span className="font-medium">Pessoas:</span> {selectedReservation.num_people}</div>
                <div><span className="font-medium">Contacto:</span> {selectedReservation.contact}</div>
                <div><span className="font-medium">Caução:</span> {selectedReservation.deposit_amount}€</div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={STATUS_LABELS[selectedReservation.status]?.className}>
                  {STATUS_LABELS[selectedReservation.status]?.label}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
