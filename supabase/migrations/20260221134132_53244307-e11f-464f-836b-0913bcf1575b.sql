
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'direction');
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE public.deposit_status AS ENUM ('pending', 'paid', 'returned');

-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  UNIQUE (user_id, role)
);

-- Reservations table
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  responsible_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT '',
  num_people INTEGER NOT NULL DEFAULT 1,
  contact TEXT NOT NULL DEFAULT '',
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  deposit_status deposit_status NOT NULL DEFAULT 'pending',
  status reservation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS: rooms - everyone authenticated can read active rooms
CREATE POLICY "Anyone can view rooms" ON public.rooms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage rooms" ON public.rooms
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: reservations
CREATE POLICY "All authenticated can view reservations" ON public.reservations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members can create reservations" ON public.reservations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (public.has_role(auth.uid(), 'member') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Members can cancel own pending reservations" ON public.reservations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reservations" ON public.reservations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger: auto-assign member role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: update updated_at on reservations
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default 6 rooms
INSERT INTO public.rooms (name, description, color) VALUES
  ('Sala 1', 'Sala principal', '#3B82F6'),
  ('Sala 2', 'Sala de reuniões', '#10B981'),
  ('Sala 3', 'Sala de eventos', '#F59E0B'),
  ('Sala 4', 'Sala multiusos', '#EF4444'),
  ('Sala 5', 'Sala de formação', '#8B5CF6'),
  ('Sala 6', 'Sala de apoio', '#EC4899');
