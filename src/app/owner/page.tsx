import { OwnerAuthGuard } from "@/components/OwnerAuthGuard";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { OwnerInsights } from "@/components/owner/OwnerInsights";

export default function OwnerPage() {
  return (
    <OwnerAuthGuard>
      <OwnerShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
          <OwnerInsights />
        </div>
        {/* Separador visual entre Insights y Dashboard operativo */}
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-12">
          <div className="border-t border-[color:var(--border-subtle)]" />
        </div>
        <OwnerDashboard />
      </OwnerShell>
    </OwnerAuthGuard>
  );
}
