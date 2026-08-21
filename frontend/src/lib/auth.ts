import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * NextAuth is used purely to run the real Google OAuth handshake and hand
 * us back a Google ID token. The backend is the actual source of truth for
 * "who is logged in" — see lib/api.ts's exchangeGoogleSession(), which
 * posts that id token to POST /api/auth/google and gets an httpOnly
 * session cookie back for all subsequent API calls.
 */
export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.id_token) {
        token.idToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.idToken = token.idToken as string | undefined;
      return session;
    },
  },
};
