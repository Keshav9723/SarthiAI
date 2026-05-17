// lib/supabase/client.ts
// Browser-side Supabase client. Reads the publishable key (formerly anon key).
// Use this inside Client Components — anything with "use client" at the top.
//
// Example:
//   const supabase = createBrowserClient();
//   const { data } = await supabase.from("itineraries").select("*");

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
