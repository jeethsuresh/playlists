import { CredentialsSignin } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "@playlists/db";
import { canLogin } from "@playlists/shared";
import { authConfig } from "./auth.config";
import { ensureDbReady, getDb } from "./db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: "user" | "admin";
      status: "pending" | "approved" | "rejected";
    };
  }

  interface User {
    id: string;
    email: string;
    role: "user" | "admin";
    status: "pending" | "approved" | "rejected";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "user" | "admin";
    status: "pending" | "approved" | "rejected";
  }
}

class PendingApprovalError extends CredentialsSignin {
  code = "pending_approval";
}

class RejectedAccountError extends CredentialsSignin {
  code = "rejected";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        await ensureDbReady();
        const email = credentials?.email?.toString().toLowerCase();
        const password = credentials?.password?.toString();
        if (!email || !password) {
          return null;
        }

        const db = getDb();
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user) {
          return null;
        }

        if (!canLogin(user.status)) {
          if (user.status === "pending") {
            throw new PendingApprovalError();
          }
          throw new RejectedAccountError();
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.status = token.status;
      return session;
    },
  },
});
