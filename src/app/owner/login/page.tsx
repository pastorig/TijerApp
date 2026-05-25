import { OwnerLoginForm } from "@/components/OwnerLoginForm";

type OwnerLoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function OwnerLoginPage({
  searchParams,
}: OwnerLoginPageProps) {
  const { error } = await searchParams;

  return <OwnerLoginForm errorCode={error} />;
}
