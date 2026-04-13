import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreateReservation } from "@/hooks/useReservations";
import { toast } from "@/hooks/use-toast";
import { BookingForm } from "@/components/BookingForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewBooking() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const createReservation = useCreateReservation();

  const handleBookingSubmit = async (data: any) => {
    if (!user) return;
    try {
      await createReservation.mutateAsync({ ...data, user_id: user.id });
      toast({ title: "Reserva criada!", description: "A reserva foi submetida em estado pendente." });
      navigate("/my-bookings");
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Nova Reserva</CardTitle>
      </CardHeader>
      <CardContent>
        <BookingForm 
          onSubmit={handleBookingSubmit} 
          userRole={role} 
        />
      </CardContent>
    </Card>
  );
}
