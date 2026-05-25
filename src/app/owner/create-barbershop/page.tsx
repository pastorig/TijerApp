import { OwnerAuthGuard } from "@/components/OwnerAuthGuard";
import { OwnerCreateBarbershopForm } from "@/components/OwnerCreateBarbershopForm";

export default function OwnerCreateBarbershopPage() {
  return (
    <OwnerAuthGuard>
      <OwnerCreateBarbershopForm />
    </OwnerAuthGuard>
  );
}
