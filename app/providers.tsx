"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? ""
);

function useClerkAuthWithOrgToken() {
  const auth = useAuth();

  // Convex's `ConvexProviderWithClerk` calls `getToken({ template: "convex" })` but does not pass
  // Clerk's `organizationId`, which means Convex auth tokens can miss `org_id` even when an org is active.
  // Wrap `getToken` so the org context is always included.
  const getToken = async (options: { template?: "convex"; skipCache?: boolean }) => {
    const clerkGetToken = auth.getToken as unknown as (
      options: { template?: string; skipCache?: boolean; organizationId?: string }
    ) => Promise<string | null>;

    // IMPORTANT: Convex expects a token whose `aud` matches `applicationID: "convex"` in `convex/auth.config.ts`.
    // That requires using the Clerk JWT template named `convex` (unless you've configured Convex differently).
    // We also pass `organizationId` so the token includes org context for multi-tenancy.
    return await clerkGetToken({
      ...options,
      organizationId: auth.orgId ?? undefined,
    });
  };

  return {
    ...auth,
    getToken,
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useClerkAuthWithOrgToken}>
      {children}
    </ConvexProviderWithClerk>
  );
}
