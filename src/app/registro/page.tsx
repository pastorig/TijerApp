import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Empezá gratis",
  description:
    "Creá tu barbería en TijerApp y probá 14 días gratis, sin tarjeta.",
};

export default function RegistroPage() {
  return <RegisterForm />;
}
