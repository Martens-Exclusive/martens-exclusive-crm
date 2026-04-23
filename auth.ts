import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt"
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Wachtwoord", type: "password" }
      },
      async authorize(credentials) {
        try {
          const email = String(credentials?.email ?? "")
            .trim()
            .toLowerCase();
          const password = String(credentials?.password ?? "");

          console.log("AUTH DEBUG: incoming email =", email);

          if (!email || !password) {
            console.log("AUTH DEBUG: missing email or password");
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email }
          });

          console.log(
            "AUTH DEBUG: user found =",
            user
              ? {
                  id: user.id,
                  email: user.email,
                  isActive: user.isActive,
                  hasPasswordHash: Boolean(user.passwordHash),
                  role: user.role
                }
              : null
          );

          if (!user || !user.passwordHash || !user.isActive) {
            console.log("AUTH DEBUG: user missing / inactive / no password hash");
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          console.log("AUTH DEBUG: password match =", isValid);

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
            role: user.role
          };
        } catch (error) {
          console.error("AUTH DEBUG: authorize crashed", error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        if ("role" in user && typeof user.role === "string") {
          token.role = user.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = typeof token.role === "string" ? token.role : "";
      }

      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
});