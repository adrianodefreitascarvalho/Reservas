import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Reservation = Tables<"reservations">;

type ReservationStatus = "pending" | "confirmed" | "cancelled";

export function useReservations(filters?: { date_from?: string; date_to?: string; room_id?: string; status?: ReservationStatus | string }) {
  return useQuery({
    queryKey: ["reservations", filters],
    queryFn: async () => {
      let q = supabase.from("reservations").select("*, rooms(name, color)").order("date").order("start_time");
      if (filters?.date_from) q = q.gte("date", filters.date_from);
      if (filters?.date_to) q = q.lte("date", filters.date_to);
      if (filters?.room_id) q = q.eq("room_id", filters.room_id);
      if (filters?.status) q = q.eq("status", filters.status as "pending" | "confirmed" | "cancelled");
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useMyReservations(userId?: string) {
  return useQuery({
    queryKey: ["my-reservations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, rooms(name, color)")
        .eq("user_id", userId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reservation: TablesInsert<"reservations">) => {
      const { data, error } = await supabase.from("reservations").insert(reservation).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
    },
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"reservations"> & { id: string }) => {
      const { data, error } = await supabase.from("reservations").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
    },
  });
}
