// lib/supabase/server.ts
// Server-side Supabase client that reads + writes the auth cookies so
// session state stays in sync across SSR / route handlers / middleware.
// Use this inside Server Components, Route Handlers, and Server Actions.
//
// Example:
//   const supabase = createServerClient();
//   const { data: { user } } = await supabase.auth.getUser();

import { createServerClient as create } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerClient() {
  // Next 14 cookies() is synchronous. If you upgrade to Next 15, this becomes
  // `const cookieStore = await cookies();` and the surrounding fn becomes
  // async — every caller needs `await` too.
  const cookieStore = cookies();

  return create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can't mutate cookies — silently ignore.
            // Middleware handles the actual refresh.
          }
        },
      },
    }
  );
}
