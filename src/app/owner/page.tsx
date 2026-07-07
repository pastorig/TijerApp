import { OwnerAuthGuard } from "@/components/OwnerAuthGuard";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { OwnerInsights } from "@/components/owner/OwnerInsights";

export default function OwnerPage() {
  return (
    <OwnerAuthGuard>
      <OwnerShell>
        <OwnerInsights />
        {/* Separador visual entre Insights y Dashboard operativo */}
        <div className="my-6 border-t border-[color:var(--border-subtle)] sm:my-8" />
        <OwnerDashboard />
      </OwnerShell>
    </OwnerAuthGuard>
  );
}
