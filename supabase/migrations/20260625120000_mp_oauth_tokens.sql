-- ============================================================================
-- MercadoPago OAuth — refresh token + vencimiento del access token
-- ============================================================================
-- Para conectar la cuenta de MP por OAuth (botón "Conectar con MercadoPago")
-- necesitamos guardar el refresh_token (para renovar el access_token, que vence
-- ~180 días) y la fecha de vencimiento. Las demás columnas mp_* ya existen
-- (migración 20260607210000_mercadopago_deposits.sql).
-- ============================================================================

alter table public.barbershops
  add column if not exists mp_refresh_token text null;

alter table public.barbershops
  add column if not exists mp_token_expires_at timestamptz null;
