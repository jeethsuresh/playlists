import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const host = request.headers.get("host") ?? "";
      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
      const isPublicInvite = pathname.startsWith("/invite");
      const isLoggedIn = !!auth?.user;
      const isLocalHealthProbe =
        pathname === "/" &&
        /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host);

      if (isLocalHealthProbe) {
        return true;
      }

      if (!isLoggedIn && !isAuthPage && !isPublicInvite) {
        const login = new URL("/login", request.nextUrl);
        login.searchParams.set("callbackUrl", request.nextUrl.toString());
        return Response.redirect(login);
      }
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/", request.nextUrl));
      }
      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
