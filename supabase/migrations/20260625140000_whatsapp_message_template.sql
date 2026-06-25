-- ============================================================================
-- Mensaje de WhatsApp personalizable por barbería
-- ============================================================================
-- Cada barbería puede personalizar el texto del mensaje que el barbero le manda
-- al cliente por WhatsApp (el del "Próximo turno" / fila del turnero).
-- Si es null, se usa el mensaje por defecto (lo que tiene SV Barber hoy).
-- Placeholders soportados en el texto: {nombre} {barberia} {fecha} {hora}.
-- El link de confirmar/cancelar se agrega siempre automáticamente al final.
-- ============================================================================

alter table public.barbershops
  add column if not exists whatsapp_message_template text null;
