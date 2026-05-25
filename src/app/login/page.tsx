import { GlobalLoginForm } from "@/components/GlobalLoginForm";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return <GlobalLoginForm nextPath={next} />;
}
