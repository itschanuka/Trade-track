import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

const isProduction = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            emailVerified: true
          }
        });

        if (!user?.password || !user.emailVerified) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60
  },
  cookies: {
    sessionToken: {
      name: isProduction
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        domain: isProduction ? ".tradetrack.app" : undefined
      }
    }
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login"
  }
};
