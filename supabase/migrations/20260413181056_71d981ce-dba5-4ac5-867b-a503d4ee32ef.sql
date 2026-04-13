
-- Fix 1: Drop the overly permissive "Members can update own reservations" policy (USING true / WITH CHECK true)
DROP POLICY IF EXISTS "Members can update own reservations" ON public.reservations;

-- Fix 2: Drop the redundant "Membros podem editar dados financeiros" policy (also owner-scoped UPDATE, duplicates cancel policy)
DROP POLICY IF EXISTS "Membros podem editar dados financeiros" ON public.reservations;

-- Create a properly scoped replacement so members can update their own reservations
CREATE POLICY "Members can update own reservations"
  ON public.reservations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix 3: Recreate direction policies targeting authenticated instead of public
DROP POLICY IF EXISTS "Direção pode visualizar todas as reservas" ON public.reservations;
CREATE POLICY "Direção pode visualizar todas as reservas"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'direction'::app_role
  ));

DROP POLICY IF EXISTS "Direção pode visualizar todas as salas" ON public.rooms;
CREATE POLICY "Direção pode visualizar todas as salas"
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'direction'::app_role
  ));
