import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos guarda TijerApp, para qué los usa y cómo pedir que se borren.",
  alternates: { canonical: "/privacidad" },
};

const CONTACTO = "tijerapp@gmail.com";

export default function PrivacidadPage() {
  return (
    <LegalPage
      titulo="Política de privacidad"
      actualizado="23 de noviembre de 2026"
      intro={
        <p>
          TijerApp es un sistema de turnos para barberías. Esta página explica qué datos guardamos,
          para qué los usamos y qué podés pedirnos. Si tenés dudas, escribinos a{" "}
          <a className="text-[color:var(--brand-gold)]" href={`mailto:${CONTACTO}`}>
            {CONTACTO}
          </a>
          .
        </p>
      }
      secciones={[
        {
          titulo: "Datos de las barberías y su equipo",
          parrafos: [
            "Cuando una barbería crea su cuenta guardamos el nombre de la barbería, el nombre y el WhatsApp de quien la administra y su mail. Si entra con Google, recibimos de Google solo su nombre, su mail y su foto de perfil; no accedemos a su correo, contactos ni a nada más de su cuenta.",
            "De los empleados que la barbería suma guardamos su nombre, su mail y los permisos que la barbería les da.",
            "También guardamos lo que la barbería carga para trabajar: servicios, precios, horarios, turnos, cobros y reportes.",
          ],
        },
        {
          titulo: "Datos de los clientes que reservan",
          parrafos: [
            "Para sacar un turno pedimos nombre y teléfono, y el mail si la barbería lo pide. Con esos datos la barbería ve el turno en su agenda y le mandamos al cliente la confirmación, el recordatorio y el pedido de reseña.",
            "Los datos de cada cliente son de la barbería donde reservó: otras barberías no los ven.",
          ],
        },
        {
          titulo: "Para qué los usamos",
          parrafos: [
            "Solo para que el sistema funcione: mostrar la agenda, avisar de turnos nuevos o cancelados, mandar recordatorios, cobrar señas cuando la barbería las usa y darle soporte a la barbería. No vendemos ni compartimos datos con fines publicitarios.",
          ],
        },
        {
          titulo: "Con quién trabajamos",
          parrafos: [
            "Para funcionar usamos proveedores que guardan o procesan datos por nosotros: Supabase (base de datos e inicio de sesión), Vercel (donde corre la página), Resend (envío de mails), Mercado Pago (cobro de señas, solo si la barbería lo activa), Sentry (registro de errores) y Google (inicio de sesión con Google).",
            "También medimos visitas de forma agregada para saber qué páginas se usan, sin publicidad ni perfiles de personas.",
          ],
        },
        {
          titulo: "Qué podés pedirnos",
          parrafos: [
            <>
              Ver, corregir o borrar tus datos. Si sos una barbería, también podés pedir la baja de tu
              cuenta y de todo lo que cargaste. Si sos cliente de una barbería, podés pedírselo a la
              barbería o escribirnos a{" "}
              <a className="text-[color:var(--brand-gold)]" href={`mailto:${CONTACTO}`}>
                {CONTACTO}
              </a>
              .
            </>,
            "Los datos se guardan mientras la cuenta de la barbería esté activa o mientras haga falta para resolver un reclamo o cumplir la ley.",
          ],
        },
        {
          titulo: "Cambios",
          parrafos: [
            "Si cambiamos esta política, actualizamos esta página y la fecha de arriba. Si el cambio es importante, se lo avisamos a las barberías por mail.",
          ],
        },
      ]}
    />
  );
}
