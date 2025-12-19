import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Auth-only middleware (no CSP / security headers).
// Keep protection scoped to app surfaces that require login;
// Clerk components handle post-login redirects.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/aegis(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
