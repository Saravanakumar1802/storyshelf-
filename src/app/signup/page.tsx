import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { features } from "@/config/features";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function SignupPage() {
  // gated by the `accounts` flag — see src/config/features.ts
  if (!features.accounts) notFound();
  return (
    <AuthShell
      eyebrow="Create your StoryShelf account"
      title={
        <>
          Every story starts <em className="gold-text italic">somewhere</em>.
        </>
      }
    >
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
