import NextAuth, { type NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type ExtendedToken = JWT & {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  error?: string;
};

async function refreshGoogleAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
  if (!token.refresh_token) {
    return { ...token, error: "MissingRefreshToken" };
  }

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });

  try {
    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      return { ...token, error: "RefreshAccessTokenError" };
    }

    const refreshed: GoogleTokenResponse = await res.json();
    return {
      ...token,
      access_token: refreshed.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 0),
      refresh_token: refreshed.refresh_token ?? token.refresh_token,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      const extended = token as ExtendedToken;
      if (account) {
        extended.access_token = account.access_token;
        extended.refresh_token = account.refresh_token ?? extended.refresh_token;
        extended.expires_at = account.expires_at;
        return extended;
      }

      if (extended.expires_at && Date.now() / 1000 < extended.expires_at - 60) {
        return extended;
      }
      return refreshGoogleAccessToken(extended);
    },
    async session({ session, token }) {
      const extended = token as ExtendedToken;
      (session as any).access_token = extended.access_token;
      (session as any).refresh_token = extended.refresh_token;
      (session as any).expires_at = extended.expires_at;
      (session as any).token_error = extended.error;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export default handler;
