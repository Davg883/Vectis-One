"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 text-white ring-1 ring-white/10">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Vectis</p>
          <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-white/70">Access Mission Control.</p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard/aegis"
        />
      </div>
    </div>
  );
}
