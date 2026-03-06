
-- Ensure all triggers exist (idempotent with DROP IF EXISTS)
DROP TRIGGER IF EXISTS prevent_user_id_change_trigger ON public.reservations;
CREATE TRIGGER prevent_user_id_change_trigger
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_id_change();

DROP TRIGGER IF EXISTS check_reservation_overlap_trigger ON public.reservations;
CREATE TRIGGER check_reservation_overlap_trigger
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_reservation_overlap();

DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
