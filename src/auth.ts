import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

class UnverifiedEmailError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string)?.trim()?.toLowerCase();
        const password = credentials?.password as string;

        if (!email || !password) return null;

        // Check for System Admin login via environment variable
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (email === "admin" && adminPassword && password === adminPassword) {
          return {
            id: "admin-system-id",
            email: "admin",
            name: "System Admin",
            role: "admin",
          };
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        if (!user.emailVerified) {
          throw new UnverifiedEmailError();
        }

        return { id: user.id, email: user.email, name: user.username, role: "user" };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role || "user";
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.user?.name) token.name = session.user.name;
      }
      if (token.id && token.id !== "admin-system-id") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { username: true },
        });
        if (dbUser?.username) {
          token.name = dbUser.username;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.name) session.user.name = token.name as string;
      if (token.role) session.user.role = token.role as string;
      return session;
    },
  },
});
