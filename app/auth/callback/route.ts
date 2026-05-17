// app/auth/callback/route.ts
// OAuth + email-confirmation landing route. Supabase redirects back here
// with a `?code=...` query param. We exchange it for a session (which sets
// the auth cookies on this response), then redirect the user onward.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Fall through to the error redirect below — auth state stays signed out
    console.error("[auth/callback] exchange failed:", error.message);
  }

  return NextResponse.redirect(
    `${origin}/auth?error=${encodeURIComponent("Sign-in failed. Try again.")}`
  );
}
