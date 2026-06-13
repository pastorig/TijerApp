import { OwnerAuthGuard } from "@/components/OwnerAuthGuard";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { OwnerPlansManager } from "@/components/owner/OwnerPlansManager";

export default function OwnerPlansPage() {
  return (
    <OwnerAuthGuard>
      <OwnerShell>
        <OwnerPlansManager />
      </OwnerShell>
    </OwnerAuthGuard>
  );
}
