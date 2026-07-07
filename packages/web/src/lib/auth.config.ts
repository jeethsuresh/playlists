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
      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
      const isPublicInvite = pathname.startsWith("/invite");
      const isLoggedIn = !!auth?.user;

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
