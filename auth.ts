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
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        console.log("AUTH email:", email);

        if (!email || !password) {
          console.log("AUTH result: missing email or password");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email }
        });

        console.log(
          "AUTH user:",
          user
            ? {
                email: user.email,
                isActive: user.isActive,
                hasPasswordHash: Boolean(user.passwordHash)
              }
            : null
        );

        if (!user) {
          console.log("AUTH result: user not found");
          return null;
        }

        if (!user.passwordHash) {
          console.log("AUTH result: no password hash");
          return null;
        }

        if (!user.isActive) {
          console.log("AUTH result: user inactive");
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log("AUTH password match:", isValid);

        if (!isValid) {
          console.log("AUTH result: invalid password");
          return null;
        }

        console.log("AUTH result: success");

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim()
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
});