
-- Role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'staff', 'part_time');
CREATE TYPE public.drive_type AS ENUM ('FF', 'FR', '4WD', 'AWD', 'MR', 'RR');
CREATE TYPE public.tire_season AS ENUM ('summer', 'winter', 'all_season');
CREATE TYPE public.uneven_wear AS ENUM ('none', 'inner', 'outer', 'both');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 1. profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. user_roles (separate table — never store roles on profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- security definer role checker (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- 3. customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  name_kana TEXT,
  line_id TEXT UNIQUE,
  phone TEXT,
  car_model TEXT NOT NULL,
  plate TEXT,
  drive_type public.drive_type,
  monthly_mileage_km INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. visit_histories
CREATE TABLE public.visit_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL,
  service_menu TEXT NOT NULL,
  odometer_km INTEGER,
  revenue_jpy INTEGER,
  wait_minutes INTEGER,
  staff_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_histories TO authenticated;
GRANT ALL ON public.visit_histories TO service_role;
ALTER TABLE public.visit_histories ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_visit_histories_customer ON public.visit_histories(customer_id);
CREATE INDEX idx_visit_histories_visited_at ON public.visit_histories(visited_at DESC);

-- 5. tire_conditions
CREATE TABLE public.tire_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.visit_histories(id) ON DELETE CASCADE,
  season public.tire_season NOT NULL,
  brand TEXT,
  size TEXT,
  manufacture_year INTEGER,
  groove_mm NUMERIC(4,2),
  hardness INTEGER,
  uneven_wear public.uneven_wear NOT NULL DEFAULT 'none',
  risk_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tire_conditions TO authenticated;
GRANT ALL ON public.tire_conditions TO service_role;
ALTER TABLE public.tire_conditions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tire_conditions_visit ON public.tire_conditions(visit_id);

-- 6. dynamic_slots
CREATE TABLE public.dynamic_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  target_segment TEXT,
  benefit_label TEXT NOT NULL,
  discount_percent INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dynamic_slots TO authenticated;
GRANT ALL ON public.dynamic_slots TO service_role;
ALTER TABLE public.dynamic_slots ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_dynamic_slots_updated BEFORE UPDATE ON public.dynamic_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Owners can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Owners can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- customers — all staff can read/write
CREATE POLICY "Staff read customers" ON public.customers
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owners/staff update customers" ON public.customers
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'staff')
  );
CREATE POLICY "Owners delete customers" ON public.customers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- visit_histories
CREATE POLICY "Staff read visits" ON public.visit_histories
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert visits" ON public.visit_histories
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owners/staff update visits" ON public.visit_histories
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'staff')
  );
CREATE POLICY "Owners delete visits" ON public.visit_histories
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- tire_conditions
CREATE POLICY "Staff read tires" ON public.tire_conditions
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert tires" ON public.tire_conditions
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owners/staff update tires" ON public.tire_conditions
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'staff')
  );
CREATE POLICY "Owners delete tires" ON public.tire_conditions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- dynamic_slots — staff read, owner manage
CREATE POLICY "Staff read slots" ON public.dynamic_slots
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Owners manage slots" ON public.dynamic_slots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
