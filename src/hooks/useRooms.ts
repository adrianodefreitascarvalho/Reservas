import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Room = Tables<"rooms">;

export function useRooms(activeOnly = false) {
  return useQuery({
    queryKey: ["rooms", activeOnly],
    queryFn: async () => {
      let q = supabase.from("rooms").select("*").order("name");
      if (activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as Room[];
    },
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (room: TablesInsert<"rooms">) => {
      const { data, error } = await supabase.from("rooms").insert(room).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"rooms"> & { id: string }) => {
      const { data, error } = await supabase.from("rooms").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}
