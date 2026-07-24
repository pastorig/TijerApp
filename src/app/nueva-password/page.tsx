import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  robots: { index: false, follow: false },
};

export default function NewPasswordPage() {
  return <NewPasswordForm />;
}
