// src/auth.config.ts
import Credentials from "next-auth/providers/credentials";
import type { NextAuthOptions, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds): Promise<User | null> {
        const email = creds?.email?.toString() ?? "";
        const password = creds?.password?.toString() ?? "";

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
          const user: User = {
            id: "admin-1",
            name: "Administrator",
            email,
            // properti role dikenali karena kita augment tipe di file .d.ts di bawah
            role: "admin",
          };
          return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      if (user?.role) token.role = user.role;
      token.role = token.role ?? "user";
      return token;
    },
    async session({ session, token }): Promise<Session> {
      if (session.user) {
        session.user.role = (token as JWT).role ?? "user";
      }
      return session;
    },
  },
};
