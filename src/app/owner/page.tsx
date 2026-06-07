import { OwnerAuthGuard } from "@/components/OwnerAuthGuard";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { OwnerInsights } from "@/components/owner/OwnerInsights";

export default function OwnerPage() {
  return (
    <OwnerAuthGuard>
      <OwnerShell>
        <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-8 sm:pt-10 lg:px-12">
          <OwnerInsights />
        </div>
        <OwnerDashboard />
      </OwnerShell>
    </OwnerAuthGuard>
  );
}
