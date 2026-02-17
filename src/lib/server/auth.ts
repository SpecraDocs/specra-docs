import { SvelteKitAuth } from '@auth/sveltekit';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GitHub from '@auth/sveltekit/providers/github';
import Credentials from '@auth/sveltekit/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db.js';

declare module '@auth/core/types' {
  interface User {
    role?: string;
    status?: string;
  }
  interface Session {
    user: User & { id: string; email: string; name?: string | null; image?: string | null };
  }
}

export const { handle, signIn, signOut } = SvelteKitAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma) as never,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.role) {
        session.user.role = token.role as 'USER' | 'ADMIN';
      }
      if (token.status) {
        session.user.status = token.status as 'ACTIVE' | 'BLOCKED';
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as any).role ?? 'USER';
        token.status = (user as any).status ?? 'ACTIVE';
      }
      if ((!token.role || !token.status) && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, status: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
        }
      }
      // Refresh role and status on session update
      if (trigger === 'update' && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, status: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
        }
      }
      return token;
    },
  },
});
