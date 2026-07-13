import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { rateLimit, STEALTH_ERRORS, fingerprintSignal } from "@/lib/security";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: UserRole;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

function sessionMaxAgeSeconds() {
  try {
    // Lazy require avoids edge issues if auth imported early
    const hours = Number(process.env.SESSION_MAX_AGE_HOURS ?? 8);
    return Math.max(1, Math.min(168, hours)) * 60 * 60;
  } catch {
    return 8 * 60 * 60;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Prefer AUTH_SECRET; fall back so production boots if unset (set real secret ASAP)
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "aegis-dev-secret-change-in-production-32chars",
  session: {
    strategy: "jwt",
    maxAge: sessionMaxAgeSeconds(),
    updateAge: 60 * 60,
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-aegis.session-token"
          : "aegis.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // Per-email rate limit (stealth — same response either way)
        const rl = rateLimit({
          key: `login:${email}`,
          limit: 8,
          windowMs: 15 * 60 * 1000,
        });
        if (!rl.ok) {
          await writeAudit({
            entityType: "Auth",
            entityId: fingerprintSignal([email]),
            action: "LOGIN_RATE_LIMITED",
            payload: { emailHash: fingerprintSignal([email]) },
          }).catch(() => undefined);
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });
        // Constant-ish work: always hash compare path shape
        if (!user) {
          await bcrypt.compare(password, "$2a$10$invalidhashpaddingxxxxxxxxxxxxuuu");
          await writeAudit({
            entityType: "Auth",
            entityId: fingerprintSignal([email]),
            action: "LOGIN_FAIL",
            payload: { reason: "unknown_user" },
          }).catch(() => undefined);
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await writeAudit({
            actorId: user.id,
            entityType: "Auth",
            entityId: user.id,
            action: "LOGIN_FAIL",
            payload: { reason: "bad_password" },
          }).catch(() => undefined);
          return null;
        }

        await writeAudit({
          actorId: user.id,
          entityType: "Auth",
          entityId: user.id,
          action: "LOGIN_OK",
          payload: { role: user.role },
          eventType: "auth.login_ok",
        }).catch(() => undefined);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.sub = user.id!;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  // Stealth: never expose debug in production
  debug: false,
  logger: {
    error() {
      /* suppress stack to console in prod surfaces */
    },
    warn() {},
    debug() {},
  },
});

export async function requireSession(roles?: UserRole[]) {
  const session = await auth();
  if (!session?.user) return null;
  if (roles && !roles.includes(session.user.role)) return null;
  return session;
}

export { STEALTH_ERRORS };
