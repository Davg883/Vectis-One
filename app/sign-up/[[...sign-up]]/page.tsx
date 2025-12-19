"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 text-white ring-1 ring-white/10">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Vectis</p>
          <h1 className="mt-2 text-2xl font-semibold">Create account</h1>
          <p className="mt-1 text-sm text-white/70">Start your Aegis tenancy.</p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/dashboard/aegis"
        />
      </div>
    </div>
  );
}
