// convex/auth.config.ts
export default {
  providers: [
    {
      // REPLACE with your Clerk Issuer URL (from Clerk Dashboard -> Configure -> JWT Templates)
      domain: "https://your-clerk-issuer-url.clerk.accounts.dev", 
      applicationID: "convex",
    },
  ],
};