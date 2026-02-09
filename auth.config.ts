import type { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"

// Edge-compatible auth config (no Node.js dependencies like pg, bcrypt, prisma)
// Used by middleware. The full auth.ts extends this with PrismaAdapter + Credentials.
export default {
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      if (token.role) {
        session.user.role = token.role as "USER" | "ADMIN"
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.role = user.role ?? "USER"
      }
      return token
    },
  },
} satisfies NextAuthConfig
