import { Separator } from "@/components/ui/separator";

interface Reservation {
  responsible_name: string;
  num_people: number;
  menu_price: number;
  total_amount: number;
}

export function ReservationDetails({ reservation }: { reservation: Reservation }) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value || 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-muted-foreground">Responsável:</span>
        <span className="font-medium text-right">{reservation.responsible_name}</span>
        
        <span className="text-muted-foreground">Nº de Pessoas:</span>
        <span className="font-medium text-right">{reservation.num_people}</span>

        <span className="text-muted-foreground">Preço por Menu:</span>
        <span className="font-medium text-right">{formatCurrency(reservation.menu_price)}</span>

        <Separator className="col-span-2 my-2" />

        <span className="text-lg font-semibold">Valor Total:</span>
        <span className="text-lg font-bold text-primary text-right">
          {formatCurrency(reservation.total_amount)}
        </span>
      </div>
    </div>
  );
}