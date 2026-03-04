import type { Database } from "@/integrations/supabase/types";

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];

// Extend the auto-generated Supabase types to include related data
// This is useful for when you fetch reservations with their corresponding room details.
export type Reservation = Omit<ReservationRow, "status"> & {
  status: ReservationRow["status"] | "archived";
  rooms?: Database["public"]["Tables"]["rooms"]["Row"] | null;
};