import type { Metadata } from "next";
import { CompletarRegistroForm } from "@/components/auth/CompletarRegistroForm";

export const metadata: Metadata = {
  title: "Creá tu barbería",
  robots: { index: false, follow: false },
};

export default function CompletarRegistroPage() {
  return <CompletarRegistroForm />;
}
