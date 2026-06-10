import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "deleted";

type AppointmentInsert = {
  barbershop_slug: string;
  barber_id: string;
  barber_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  service_name: string;
  service_price: number;
  service_duration_minutes: number;
  appointment_date: string;
  appointment_time: string;
  comment: string;
  status: AppointmentStatus;
  actual_duration_minutes?: number | null;
  confirmation_token?: string;
  internal_notes?: string | null;
  cancellation_reason?: string | null;
  // Cupón aplicado al crear la reserva (FASE C parte 2)
  coupon_id?: string | null;
  discount_amount?: number | null;
  // MercadoPago — seña del turno (B1). Opcionales: solo se setean si la
  // barbería tiene mp_enabled=true.
  deposit_required?: boolean;
  deposit_amount?: number | null;
  deposit_status?: "pending" | "paid" | "expired" | "refunded" | "failed" | null;
  deposit_paid_at?: string | null;
  deposit_expires_at?: string | null;
  mp_payment_id?: string | null;
  mp_preference_id?: string | null;
};

type AppointmentRow = Omit<AppointmentInsert, "status"> & {
  id?: string;
  created_at?: string;
  status: AppointmentStatus;
};

type AppointmentReviewRow = {
  id: string;
  appointment_id: string;
  barbershop_slug: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type AppointmentReviewInsert = {
  id?: string;
  appointment_id: string;
  barbershop_slug: string;
  rating: number;
  comment?: string | null;
  created_at?: string;
};

type BarberInsert = {
  barbershop_slug: string;
  name: string;
  display_name: string | null;
  role: string | null;
  whatsapp: string | null;
  is_active: boolean;
  is_owner?: boolean;
  deleted_at?: string | null;
};

type BarberRow = BarberInsert & {
  id: string;
  created_at: string;
  is_owner: boolean;
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
  // Agregados en migration 20260607120000_multi_admin.sql.
  // Opcionales en el tipo para que SELECT viejos (que no traen estas
  // columnas) sigan compilando.
  is_owner?: boolean;
  invited_by?: string | null;
  created_at?: string;
};

type BarbershopAdminInsert = {
  user_id: string;
  barbershop_slug: string;
  role?: string;
  is_owner?: boolean;
  invited_by?: string | null;
  created_at?: string;
};
type BarbershopAdminUpdate = Partial<BarbershopAdminInsert>;

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
  address: string | null;
  logo_url: string | null;
  google_reviews_url: string | null;
  working_hours_start: string;
  working_hours_end: string;
  slot_interval_minutes: number;
  is_active: boolean;
  auto_confirm_appointments: boolean;
  // MercadoPago (B1) — toggle de cobro de seña + credentials por barbería
  mp_enabled: boolean;
  mp_access_token: string | null;
  mp_public_key: string | null;
  mp_user_id: string | null;
  deposit_percent: number;
  deposit_min_amount: number | null;
  deposit_auto_cancel_hours: number;
};

type BarbershopInsert = Omit<
  BarbershopRow,
  | "id"
  | "created_at"
  | "address"
  | "logo_url"
  | "google_reviews_url"
  | "auto_confirm_appointments"
  | "mp_enabled"
  | "mp_access_token"
  | "mp_public_key"
  | "mp_user_id"
  | "deposit_percent"
  | "deposit_min_amount"
  | "deposit_auto_cancel_hours"
> & {
  id?: string;
  created_at?: string;
  address?: string | null;
  logo_url?: string | null;
  google_reviews_url?: string | null;
  /** Defaultea a false en DB — opcional al insertar. */
  auto_confirm_appointments?: boolean;
  // MercadoPago — todos opcionales al insertar (defaults en DB)
  mp_enabled?: boolean;
  mp_access_token?: string | null;
  mp_public_key?: string | null;
  mp_user_id?: string | null;
  deposit_percent?: number;
  deposit_min_amount?: number | null;
  deposit_auto_cancel_hours?: number;
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

type BarberDayOverrideRow = {
  id: string;
  created_at: string;
  barbershop_slug: string;
  barber_id: string;
  override_date: string;
  start_time: string;
  end_time: string;
  is_working: boolean;
  deleted_at: string | null;
};

type BarberDayOverrideInsert = Omit<
  BarberDayOverrideRow,
  "id" | "created_at"
> & {
  id?: string;
  created_at?: string;
};

type BarberDayOverrideUpdate = Partial<BarberDayOverrideInsert>;

type PublicBarberDayAppointmentRow = {
  appointment_time: string;
  service_duration_minutes: number;
};

type BarbershopClientRow = {
  id: string;
  created_at: string;
  updated_at: string;
  barbershop_slug: string;
  phone_normalized: string;
  phone_display: string;
  name: string;
  email: string | null;
  notes: string | null;
  tags: string[];
  deleted_at: string | null;
};

type BarbershopClientInsert = {
  barbershop_slug: string;
  phone_normalized: string;
  phone_display: string;
  name: string;
  email?: string | null;
  notes?: string | null;
  tags?: string[];
};

type BarbershopClientUpdate = {
  name?: string;
  phone_display?: string;
  notes?: string | null;
  tags?: string[];
  deleted_at?: string | null;
};

type BarbershopGalleryPhotoRow = {
  id: string;
  created_at: string;
  barbershop_slug: string;
  storage_path: string;
  public_url: string;
  caption: string | null;
  sort_order: number;
  deleted_at: string | null;
};

type BarbershopGalleryPhotoInsert = {
  barbershop_slug: string;
  storage_path: string;
  public_url: string;
  caption?: string | null;
  sort_order?: number;
};

type BarbershopGalleryPhotoUpdate = {
  caption?: string | null;
  sort_order?: number;
  deleted_at?: string | null;
};

type WaitlistEntryRow = {
  id: string;
  created_at: string;
  barbershop_slug: string;
  barber_id: string;
  service_name: string;
  service_duration_minutes: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  preferred_date: string;
  preferred_time_from: string | null;
  preferred_time_to: string | null;
  notes: string | null;
  status: "pending" | "contacted" | "fulfilled" | "cancelled";
  resolved_at: string | null;
  deleted_at: string | null;
  confirmation_token: string;
};

type WaitlistEntryInsert = {
  barbershop_slug: string;
  barber_id: string;
  service_name: string;
  service_duration_minutes: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  preferred_date: string;
  preferred_time_from?: string | null;
  preferred_time_to?: string | null;
  notes?: string | null;
  status?: "pending" | "contacted" | "fulfilled" | "cancelled";
};

type WaitlistEntryUpdate = Partial<WaitlistEntryInsert> & {
  resolved_at?: string | null;
  deleted_at?: string | null;
};

type ReminderLogRow = {
  id: string;
  appointment_id: string;
  kind: "reminder_24h" | "confirmation";
  channel: "email" | "whatsapp" | "push";
  sent_at: string;
  status: "sent" | "failed";
  error_message: string | null;
};

type ReminderLogInsert = {
  appointment_id: string;
  kind: "reminder_24h" | "confirmation";
  channel: "email" | "whatsapp" | "push";
  status?: "sent" | "failed";
  error_message?: string | null;
};

type ReminderLogUpdate = Partial<ReminderLogInsert>;

type ContactRequestRow = {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  source: string;
  handled_at: string | null;
  handled_by: string | null;
  deleted_at: string | null;
};

type ContactRequestInsert = {
  name: string;
  email?: string | null;
  phone?: string | null;
  message: string;
  source?: string;
};

type ContactRequestUpdate = {
  handled_at?: string | null;
  handled_by?: string | null;
  deleted_at?: string | null;
};

type PushSubscriptionRow = {
  id: string;
  created_at: string;
  last_used_at: string;
  expired_at: string | null;
  barbershop_slug: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
};

type PushSubscriptionInsert = {
  id?: string;
  created_at?: string;
  last_used_at?: string;
  expired_at?: string | null;
  barbershop_slug: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
};

type PushSubscriptionUpdate = Partial<PushSubscriptionInsert>;

type PushNotificationQueueStatus = "pending" | "sent" | "failed" | "invalid";

type PushNotificationQueueRow = {
  id: string;
  created_at: string;
  sent_at: string | null;
  subscription_id: string;
  payload: {
    title: string;
    body: string;
    url: string;
    tag: string;
  };
  status: PushNotificationQueueStatus;
  retry_count: number;
  last_error: string | null;
};

type PushNotificationQueueInsert = {
  id?: string;
  created_at?: string;
  sent_at?: string | null;
  subscription_id: string;
  payload: PushNotificationQueueRow["payload"];
  status?: PushNotificationQueueStatus;
  retry_count?: number;
  last_error?: string | null;
};

type PushNotificationQueueUpdate = Partial<PushNotificationQueueInsert>;

// ─── Loyalty ────────────────────────────────────────────────────────────────

type LoyaltyProgramRow = {
  id: string;
  barbershop_slug: string;
  is_active: boolean;
  visits_required: number;
  reward_name: string;
  reward_description: string | null;
  created_at: string;
  updated_at: string;
};

type LoyaltyProgramInsert = {
  id?: string;
  barbershop_slug: string;
  is_active?: boolean;
  visits_required?: number;
  reward_name?: string;
  reward_description?: string | null;
};

type LoyaltyProgramUpdate = Partial<LoyaltyProgramInsert> & {
  updated_at?: string;
};

type LoyaltyStampRow = {
  id: string;
  barbershop_slug: string;
  customer_phone: string;
  appointment_id: string | null;
  earned_at: string;
  redeemed_at: string | null;
  redemption_note: string | null;
};

type LoyaltyStampInsert = {
  id?: string;
  barbershop_slug: string;
  customer_phone: string;
  appointment_id?: string | null;
  earned_at?: string;
  redeemed_at?: string | null;
  redemption_note?: string | null;
};

type LoyaltyStampUpdate = Partial<LoyaltyStampInsert>;

// ─── Coupons ────────────────────────────────────────────────────────────────

type CouponDiscountType = "percent" | "fixed";

type CouponRow = {
  id: string;
  barbershop_slug: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CouponInsert = {
  id?: string;
  barbershop_slug: string;
  code: string;
  description?: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  valid_from?: string | null;
  valid_until?: string | null;
  usage_limit?: number | null;
  usage_count?: number;
  is_active?: boolean;
};

type CouponUpdate = Partial<CouponInsert> & { updated_at?: string };

type Database = {
  public: {
    Tables: {
      appointments: {
        Row: AppointmentRow;
        Insert: AppointmentInsert;
        Update: Partial<AppointmentInsert>;
        Relationships: [];
      };
      appointment_reviews: {
        Row: AppointmentReviewRow;
        Insert: AppointmentReviewInsert;
        Update: Partial<AppointmentReviewInsert>;
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
      barbershop_clients: {
        Row: BarbershopClientRow;
        Insert: BarbershopClientInsert;
        Update: BarbershopClientUpdate;
        Relationships: [];
      };
      barbershop_gallery_photos: {
        Row: BarbershopGalleryPhotoRow;
        Insert: BarbershopGalleryPhotoInsert;
        Update: BarbershopGalleryPhotoUpdate;
        Relationships: [];
      };
      contact_requests: {
        Row: ContactRequestRow;
        Insert: ContactRequestInsert;
        Update: ContactRequestUpdate;
        Relationships: [];
      };
      reminder_log: {
        Row: ReminderLogRow;
        Insert: ReminderLogInsert;
        Update: ReminderLogUpdate;
        Relationships: [];
      };
      waitlist_entries: {
        Row: WaitlistEntryRow;
        Insert: WaitlistEntryInsert;
        Update: WaitlistEntryUpdate;
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
      barber_day_overrides: {
        Row: BarberDayOverrideRow;
        Insert: BarberDayOverrideInsert;
        Update: BarberDayOverrideUpdate;
        Relationships: [];
      };
      platform_owners: {
        Row: PlatformOwnerRow;
        Insert: PlatformOwnerInsert;
        Update: PlatformOwnerUpdate;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: PushSubscriptionInsert;
        Update: PushSubscriptionUpdate;
        Relationships: [];
      };
      push_notification_queue: {
        Row: PushNotificationQueueRow;
        Insert: PushNotificationQueueInsert;
        Update: PushNotificationQueueUpdate;
        Relationships: [];
      };
      client_push_subscriptions: {
        Row: {
          id: string;
          appointment_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          expired_at: string | null;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          expired_at?: string | null;
        };
        Update: Partial<{
          appointment_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          expired_at: string | null;
        }>;
        Relationships: [];
      };
      loyalty_programs: {
        Row: LoyaltyProgramRow;
        Insert: LoyaltyProgramInsert;
        Update: LoyaltyProgramUpdate;
        Relationships: [];
      };
      loyalty_stamps: {
        Row: LoyaltyStampRow;
        Insert: LoyaltyStampInsert;
        Update: LoyaltyStampUpdate;
        Relationships: [];
      };
      coupons: {
        Row: CouponRow;
        Insert: CouponInsert;
        Update: CouponUpdate;
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
      get_public_appointment_by_token: {
        Args: { p_token: string };
        Returns: Array<{
          id: string;
          barbershop_slug: string;
          barbershop_name: string;
          barber_name: string;
          customer_name: string;
          service_name: string;
          service_price: number;
          service_duration_minutes: number;
          appointment_date: string;
          appointment_time: string;
          comment: string | null;
          status: AppointmentStatus;
        }>;
      };
      confirm_appointment_by_token: {
        Args: { p_token: string };
        Returns: {
          ok: boolean;
          status: AppointmentStatus | null;
          reason: string;
        };
      };
      cancel_appointment_by_token: {
        Args: { p_token: string };
        Returns: {
          ok: boolean;
          status: AppointmentStatus | null;
          reason: string;
        };
      };
      get_appointment_review_context_by_token: {
        Args: { p_token: string };
        Returns: Array<{
          appointment_id: string;
          barbershop_slug: string;
          barbershop_name: string | null;
          google_reviews_url: string | null;
          customer_name: string;
          service_name: string;
          appointment_date: string;
          appointment_time: string;
          status: string;
          already_submitted: boolean;
          is_in_future: boolean;
        }>;
      };
      submit_appointment_review_by_token: {
        Args: { p_token: string; p_rating: number; p_comment: string };
        Returns: Array<{
          ok: boolean;
          reason: string | null;
        }>;
      };
      list_public_reviews_by_barbershop_slug: {
        Args: { p_barbershop_slug: string; p_limit?: number };
        Returns: Array<{
          id: string;
          rating: number;
          comment: string;
          customer_first_name: string;
          service_name: string | null;
          barber_name: string | null;
          created_at: string;
        }>;
      };
      get_public_loyalty_status_by_token: {
        Args: { p_token: string };
        Returns: Array<{
          visits_required: number;
          reward_name: string;
          reward_description: string | null;
          active_stamps: number;
          is_program_active: boolean;
        }>;
      };
      validate_coupon_for_booking: {
        Args: {
          p_barbershop_slug: string;
          p_code: string;
          p_service_price?: number | null;
        };
        Returns: Array<{
          is_valid: boolean;
          error_code: string | null;
          coupon_id: string | null;
          discount_type: CouponDiscountType | null;
          discount_value: number | null;
          discount_amount: number | null;
          final_price: number | null;
        }>;
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
  AppointmentReviewInsert,
  AppointmentReviewRow,
  AppointmentRow,
  AppointmentStatus,
  ContactRequestInsert,
  ContactRequestRow,
  ContactRequestUpdate,
  Database,
  BarberInsert,
  BarberRow,
  BarberTimeBlockInsert,
  BarberDayOverrideInsert,
  BarberDayOverrideRow,
  BarberDayOverrideUpdate,
  BarberTimeBlockRow,
  BarberTimeBlockUpdate,
  BarberWeeklyScheduleInsert,
  BarberWeeklyScheduleRow,
  BarberWeeklyScheduleUpdate,
  BarberServiceInsert,
  BarberServiceRow,
  BarberServiceUpdate,
  BarberUpdate,
  BarbershopGalleryPhotoInsert,
  BarbershopGalleryPhotoRow,
  BarbershopGalleryPhotoUpdate,
  BarbershopInsert,
  BarbershopAdminInsert,
  BarbershopAdminRow,
  BarbershopAdminUpdate,
  BarbershopClientInsert,
  BarbershopClientRow,
  BarbershopClientUpdate,
  WaitlistEntryInsert,
  WaitlistEntryRow,
  WaitlistEntryUpdate,
  BarbershopRow,
  BarbershopUpdate,
  PlatformOwnerInsert,
  PlatformOwnerRow,
  PlatformOwnerUpdate,
  LoyaltyProgramRow,
  LoyaltyProgramInsert,
  LoyaltyProgramUpdate,
  LoyaltyStampRow,
  LoyaltyStampInsert,
  LoyaltyStampUpdate,
  CouponDiscountType,
  CouponRow,
  CouponInsert,
  CouponUpdate,
};
