// middleware.ts
// Runs on every request. The Supabase JWT expires after ~1 hour by default;
// without this middleware the user gets silently signed out when the token
// expires between page loads. The `getUser()` call below refreshes the
// session if it's near expiry and writes the new cookie back.
//
// Skips static asset paths to keep the middleware fast.

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          // Apply each cookie to both the incoming request (so any downstream
          // code in this same middleware sees fresh values) and the outgoing
          // response (so the browser persists them).
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Triggers a token refresh if the JWT is about to expire.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on everything except static files and image assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
