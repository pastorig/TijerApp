-- ─────────────────────────────────────────────────────────────────────────────
-- El aviso de un turno le llega a QUIEN CORRESPONDE
--
-- ─── EL PROBLEMA ─────────────────────────────────────────────────────────────
-- `enqueue_admin_push` es el único punto de reparto: por ahí pasan el aviso de
-- reserva nueva (trigger), el de "el cliente confirmó" y el de "el cliente
-- canceló". Encolaba para TODAS las suscripciones activas de la barbería.
--
-- Con una sola cuenta por barbería estaba bien: el dueño quiere enterarse de
-- todo. Con las cuentas de empleados (feature 016) deja de estarlo. No se
-- notaba porque el permiso de notificaciones solo se ofrecía en Configuración,
-- que el empleado no puede abrir — pero en cuanto se le da el interruptor
-- recibiría un aviso por CADA turno de la barbería, con nombre de cliente y
-- horario, incluidos los de sus compañeros.
--
-- ─── LA REGLA ────────────────────────────────────────────────────────────────
--   · Quien administra la barbería → todo.
--   · El empleado                  → SOLO los turnos de su barbero.
--   · Cualquier otro               → nada.
--
-- ─── POR QUÉ SE TOCA ACÁ Y NO EN CADA AVISO ──────────────────────────────────
-- Las tres funciones que avisan ya ponen `tag = 'appointment-<id>'`, así que el
-- repartidor puede deducir el turno solo. Cambiar acá deja las tres intactas
-- —cero riesgo de romper una al reescribirla— y cualquier aviso futuro que use
-- la misma convención hereda el comportamiento sin tocar nada.
--
-- ─── EL DEFAULT ES CERRADO ───────────────────────────────────────────────────
-- Si del tag no se puede sacar un turno, el aviso va SOLO a quien administra.
-- Nunca a los empleados. Un aviso que no sabemos de quién es no puede terminar
-- en el celular de alguien que quizá no tenía por qué verlo. Es lo contrario de
-- lo que pasaba antes, que era "si no sé, le mando a todos".
--
-- ─── OJO CON LOS TIPOS ───────────────────────────────────────────────────────
-- `appointments.barber_id` es text y `barber_staff_access.barber_id` es uuid.
-- Se comparan convirtiendo. Sin convertir no da error: no matchea nunca y el
-- empleado no recibiría nada.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- Se reemplaza la firma: los tres llamadores siguen invocándola con 2
-- argumentos y resuelven a esta, porque los nuevos tienen default.
drop function if exists public.enqueue_admin_push(text, jsonb);

create or replace function public.enqueue_admin_push(
  p_barbershop_slug text,
  p_payload jsonb,
  -- Si viene, manda solo a quien administra y al barbero de ese turno. Si no,
  -- se intenta deducir del tag; y si tampoco, solo a quien administra.
  p_barber_id text default null
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_sub record;
  v_barber_id text := p_barber_id;
  v_appointment_id uuid;
  v_payload jsonb;
begin
  -- Deducir el turno del tag ('appointment-<uuid>') cuando no vino explícito.
  if v_barber_id is null then
    begin
      v_appointment_id :=
        nullif(replace(coalesce(p_payload->>'tag', ''), 'appointment-', ''), '')::uuid;
    exception
      when others then
        v_appointment_id := null;
    end;

    if v_appointment_id is not null then
      select a.barber_id into v_barber_id
        from public.appointments a
       where a.id = v_appointment_id
         and a.barbershop_slug = p_barbershop_slug;
    end if;
  end if;

  for v_sub in
    select distinct on (s.id)
           s.id,
           (a.user_id is not null) as es_admin
      from public.push_subscriptions s
      left join public.barbershop_admins a
        on a.user_id = s.user_id
       and a.barbershop_slug = s.barbershop_slug
      left join public.barber_staff_access sa
        on sa.user_id = s.user_id
       and sa.barbershop_slug = s.barbershop_slug
       and sa.revoked_at is null
       and v_barber_id is not null
       and sa.barber_id::text = v_barber_id
     where s.barbershop_slug = p_barbershop_slug
       and s.expired_at is null
       -- Administra, o es el barbero de este turno. Nadie más.
       and (a.user_id is not null or sa.user_id is not null)
     -- Si alguien es las dos cosas, gana admin y recibe UNA sola vez: que
     -- llegue el mismo aviso dos veces se lee como que la app está rota.
     order by s.id, (a.user_id is not null) desc
  loop
    v_payload := p_payload;

    -- El empleado no tiene turnero: mandarlo ahí es mandarlo a una puerta que
    -- le va a rebotar.
    if not v_sub.es_admin then
      v_payload := jsonb_set(
        v_payload,
        '{url}',
        to_jsonb('/' || p_barbershop_slug || '/mi-agenda')
      );
    end if;

    insert into public.push_notification_queue (subscription_id, payload, status)
      values (v_sub.id, v_payload, 'pending');
  end loop;
exception
  when others then
    -- Se traga el error a propósito, igual que antes: que falle un aviso no
    -- puede hacer fallar la reserva que lo disparó.
    raise notice 'enqueue_admin_push failed for %: %', p_barbershop_slug, SQLERRM;
end;
$function$;

comment on function public.enqueue_admin_push(text, jsonb, text) is
  'Reparte un aviso: a quien administra la barbería siempre, y al barbero del turno si lo tiene. Nunca a otros empleados. Ver migración 20260825120000.';

commit;
