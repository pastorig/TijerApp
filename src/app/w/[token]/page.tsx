import { WaitlistConfirmClient } from "./WaitlistConfirmClient";

type WaitlistConfirmPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function WaitlistConfirmPage({
  params,
}: WaitlistConfirmPageProps) {
  const { token } = await params;
  return (
    <main className="tj-pantalla min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
        <WaitlistConfirmClient token={token} />
      </div>
    </main>
  );
}
