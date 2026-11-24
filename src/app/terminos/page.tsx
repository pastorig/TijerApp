import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Condiciones del servicio",
  description: "Las reglas de uso de TijerApp para barberías: prueba gratis, planes, pagos y baja.",
  alternates: { canonical: "/terminos" },
};

const CONTACTO = "tijerapp@gmail.com";

export default function TerminosPage() {
  return (
    <LegalPage
      titulo="Condiciones del servicio"
      actualizado="23 de noviembre de 2026"
      intro={
        <p>
          Estas condiciones aplican a las barberías que usan TijerApp. Al crear una cuenta las
          aceptás. Si algo no queda claro, escribinos a{" "}
          <a className="text-[color:var(--brand-gold)]" href={`mailto:${CONTACTO}`}>
            {CONTACTO}
          </a>
          .
        </p>
      }
      secciones={[
        {
          titulo: "Qué es TijerApp",
          parrafos: [
            "Un sistema para que una barbería maneje su agenda, reciba reservas online, avise a sus clientes y vea sus números. La barbería es responsable de los datos que carga y de la relación con sus clientes.",
          ],
        },
        {
          titulo: "Prueba gratis y planes",
          parrafos: [
            "Cada barbería nueva arranca con 14 días de prueba, sin tarjeta.",
            <>
              Después, para seguir usándolo, se paga el plan elegido por mes. Los precios vigentes
              están en{" "}
              <Link className="text-[color:var(--brand-gold)]" href="/precios">
                Precios
              </Link>
              .
            </>,
            "Si un plan vence sin pagarse, la cuenta queda en modo lectura: se ven los datos pero no se pueden cargar turnos nuevos ni recibir reservas. Al pagar, vuelve a funcionar con todo lo que tenía.",
          ],
        },
        {
          titulo: "Uso correcto",
          parrafos: [
            "La cuenta es de la barbería y de las personas que ella habilita. No se puede usar para mandar mensajes no pedidos, cargar datos de personas sin su permiso ni intentar acceder a cuentas de otras barberías.",
            "Si una cuenta se usa así, podemos suspenderla.",
          ],
        },
        {
          titulo: "Disponibilidad",
          parrafos: [
            "Trabajamos para que TijerApp funcione siempre, pero puede haber cortes por mantenimiento o por problemas de los proveedores que usamos. No respondemos por pérdidas causadas por esos cortes más allá del valor del plan del mes en que ocurrieron.",
          ],
        },
        {
          titulo: "Baja",
          parrafos: [
            "La barbería puede dejar de usar TijerApp cuando quiera, sin permanencia mínima. Si pide la baja de la cuenta, borramos sus datos como explica la Política de privacidad.",
          ],
        },
        {
          titulo: "Cambios",
          parrafos: [
            "Si cambiamos estas condiciones, actualizamos esta página y la fecha de arriba, y se lo avisamos por mail a las barberías si el cambio las afecta.",
          ],
        },
      ]}
    />
  );
}
