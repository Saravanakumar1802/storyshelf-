import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { features } from "@/config/features";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  // gated by the `accounts` flag — see src/config/features.ts
  if (!features.accounts) notFound();
  return (
    <AuthShell
      eyebrow="Sign in"
      title={
        <>
          Welcome back to <em className="gold-text italic">your</em> shelf.
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
