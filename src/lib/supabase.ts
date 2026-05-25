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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
  BarberInsert,
  BarberRow,
  BarberServiceInsert,
  BarberServiceRow,
  BarberServiceUpdate,
  BarberUpdate,
};
