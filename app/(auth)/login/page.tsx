import { redirect } from "next/navigation";
import Image from "next/image";

import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        {/* LEFT IMAGE */}
        <section className="relative hidden lg:block">
          <Image
            src="/login-car.jpg"
            alt="Martens Exclusive"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/20 to-black/75" />
        </section>

        {/* RIGHT LOGIN */}
        <section className="flex min-h-screen items-center justify-center bg-[#05070d] px-8 py-12 md:px-14 lg:px-16">
          <div className="w-full max-w-md">
            {/* LOGO */}
            <div className="mb-12 flex justify-center">
              <Image
                src="/logo.svg"
                alt="Martens Exclusive"
                width={90}
                height={36}
                className="h-auto w-auto opacity-90"
              />
            </div>

            {/* TITLE */}
            <h1 className="text-4xl font-bold tracking-tight text-white text-center">
              Aanmelden
            </h1>

            {/* SUBTEXT */}
            <p className="mt-5 text-base leading-7 text-white/70 text-center">
              Meld je aan om leads, taken en afspraken te beheren.
            </p>

            {/* FORM */}
            <div className="mt-10">
              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}