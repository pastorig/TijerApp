import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AppointmentInsert = {
  barbershop_slug: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  service_price: number;
  service_duration_minutes: number;
  appointment_date: string;
  appointment_time: string;
  comment: string;
  status: "pending";
};

type AppointmentRow = Omit<AppointmentInsert, "status"> & {
  id?: string;
  created_at?: string;
  status: string;
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

export type { AppointmentInsert, AppointmentRow };
