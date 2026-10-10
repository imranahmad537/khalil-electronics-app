import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login");
  const isAvoRoute = pathname.startsWith("/avo");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && !isAuthRoute) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .maybeSingle();
    // A deactivated employee (or a login with no staff profile) is signed out.
    // RLS already denies them everything via my_role(); this ends the session.
    // Only on a definite answer — a network/DB error must not log staff out.
    if (!profileError && !profile?.active) {
      await supabase.auth.signOut({ scope: "local" });
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "?error=inactive";
      const redirect = NextResponse.redirect(url);
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      return redirect;
    }
    if (profile?.role === "avo" && !isAvoRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/avo";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // manifest.json/sw.js/icon.svg must be fetchable without a session — the
  // browser requests them outside normal page navigation (install prompt,
  // SW registration) and a redirect-to-login breaks both.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon.svg).*)"],
};
