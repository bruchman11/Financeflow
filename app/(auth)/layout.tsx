import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/current";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Quem já está logado não precisa ver tela de login/signup
  const user = await getUser();
  if (user) redirect("/companies");

  return (
    <div className="flex-1 flex flex-col px-6 py-10">
      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center gap-8">
        {children}
      </div>
    </div>
  );
}
