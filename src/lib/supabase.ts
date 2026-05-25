import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "deleted";

type AppointmentInsert = {
  barbershop_slug: string;
  barber_id: string;
  barber_name: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  service_price: number;
  service_duration_minutes: number;
  appointment_date: string;
  appointment_time: string;
  comment: string;
  status: AppointmentStatus;
};

type AppointmentRow = Omit<AppointmentInsert, "status"> & {
  id?: string;
  created_at?: string;
  status: AppointmentStatus;
};

type BarberInsert = {
  barbershop_slug: string;
  name: string;
  display_name: string | null;
  role: string | null;
  whatsapp: string | null;
  is_active: boolean;
  deleted_at?: string | null;
};

type BarberRow = BarberInsert & {
  id: string;
  created_at: string;
  deleted_at: string | null;
};

type BarberUpdate = Partial<BarberInsert>;

type BarberServiceInsert = {
  barbershop_slug: string;
  barber_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  deleted_at?: string | null;
};

type BarberServiceRow = BarberServiceInsert & {
  id: string;
  created_at: string;
  deleted_at: string | null;
};

type BarberServiceUpdate = Partial<BarberServiceInsert>;

type BarbershopAdminRow = {
  user_id: string;
  barbershop_slug: string;
  role: string;
};

type BarbershopAdminInsert = BarbershopAdminRow;
type BarbershopAdminUpdate = Partial<BarbershopAdminRow>;

type PublicOccupiedAppointmentTimeRow = {
  appointment_time: string;
};

type BarbershopRow = {
  id: string;
  created_at: string;
  slug: string;
  name: string;
  description: string | null;
  whatsapp: string | null;
  instagram: string | null;
  working_hours_start: string;
  working_hours_end: string;
  slot_interval_minutes: number;
  is_active: boolean;
};

type BarbershopInsert = Omit<BarbershopRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

type BarbershopUpdate = Partial<BarbershopInsert>;

type PlatformOwnerRow = {
  user_id: string;
  created_at: string;
  role: string;
};

type PlatformOwnerInsert = Omit<PlatformOwnerRow, "created_at"> & {
  created_at?: string;
};

type PlatformOwnerUpdate = Partial<PlatformOwnerInsert>;

type BarberWeeklyScheduleRow = {
  id: string;
  created_at: string;
  barbershop_slug: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
};

type BarberWeeklyScheduleInsert = Omit<
  BarberWeeklyScheduleRow,
  "id" | "created_at"
> & {
  id?: string;
  created_at?: string;
};

type BarberWeeklyScheduleUpdate = Partial<BarberWeeklyScheduleInsert>;

type BarberTimeBlockRow = {
  id: string;
  created_at: string;
  barbershop_slug: string;
  barber_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  is_active: boolean;
  deleted_at: string | null;
};

type BarberTimeBlockInsert = Omit<BarberTimeBlockRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

type BarberTimeBlockUpdate = Partial<BarberTimeBlockInsert>;

type PublicBarberDayAppointmentRow = {
  appointment_time: string;
  service_duration_minutes: number;
};

type Database = {
  public: {
    Tables: {
      appointments: {
        Row: AppointmentRow;
        Insert: AppointmentInsert;
        Update: Partial<AppointmentInsert>;
        Relationships: [];
      };
      barbers: {
        Row: BarberRow;
        Insert: BarberInsert;
        Update: BarberUpdate;
        Relationships: [];
      };
      barber_services: {
        Row: BarberServiceRow;
        Insert: BarberServiceInsert;
        Update: BarberServiceUpdate;
        Relationships: [];
      };
      barbershop_admins: {
        Row: BarbershopAdminRow;
        Insert: BarbershopAdminInsert;
        Update: BarbershopAdminUpdate;
        Relationships: [];
      };
      barbershops: {
        Row: BarbershopRow;
        Insert: BarbershopInsert;
        Update: BarbershopUpdate;
        Relationships: [];
      };
      barber_weekly_schedules: {
        Row: BarberWeeklyScheduleRow;
        Insert: BarberWeeklyScheduleInsert;
        Update: BarberWeeklyScheduleUpdate;
        Relationships: [];
      };
      barber_time_blocks: {
        Row: BarberTimeBlockRow;
        Insert: BarberTimeBlockInsert;
        Update: BarberTimeBlockUpdate;
        Relationships: [];
      };
      platform_owners: {
        Row: PlatformOwnerRow;
        Insert: PlatformOwnerInsert;
        Update: PlatformOwnerUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_public_occupied_appointment_times: {
        Args: {
          p_appointment_date: string;
          p_barber_id: string;
          p_barbershop_slug: string;
        };
        Returns: PublicOccupiedAppointmentTimeRow[];
      };
      get_public_barber_day_appointments: {
        Args: {
          p_appointment_date: string;
          p_barber_id: string;
          p_barbershop_slug: string;
        };
        Returns: PublicBarberDayAppointmentRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let supabaseClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  supabaseClient = createClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
  );

  return supabaseClient;
}

export type {
  AppointmentInsert,
  AppointmentRow,
  AppointmentStatus,
  Database,
  BarberInsert,
  BarberRow,
  BarberTimeBlockInsert,
  BarberTimeBlockRow,
  BarberTimeBlockUpdate,
  BarberWeeklyScheduleInsert,
  BarberWeeklyScheduleRow,
  BarberWeeklyScheduleUpdate,
  BarberServiceInsert,
  BarberServiceRow,
  BarberServiceUpdate,
  BarberUpdate,
  BarbershopInsert,
  BarbershopAdminInsert,
  BarbershopAdminRow,
  BarbershopAdminUpdate,
  BarbershopRow,
  BarbershopUpdate,
  PlatformOwnerInsert,
  PlatformOwnerRow,
  PlatformOwnerUpdate,
};
