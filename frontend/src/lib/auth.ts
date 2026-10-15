import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { API_URL } from "@/services/api";

process.env.AUTH_URL =
  process.env.NODE_ENV === "production"
    ? process.env.AUTH_URL_PROD
    : process.env.AUTH_URL_DEV;

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class TooManyAttemptsError extends CredentialsSignin {
  code = "too_many_attempts";
}

class ServiceUnavailableError extends CredentialsSignin {
  code = "service_unavailable";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  basePath: "/api/nextauth",
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) throw new InvalidCredentialsError();

        let response: Response;
        try {
          response = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
        } catch (error) {
          console.error("Kesalahan koneksi ke backend saat login:", error);
          throw new ServiceUnavailableError();
        }

        if (response.status === 429) throw new TooManyAttemptsError();
        if (response.status >= 500) throw new ServiceUnavailableError();
        if (!response.ok) throw new InvalidCredentialsError();

        const resData = await response.json();
        if (!resData?.success || !resData?.data?.token) {
          throw new InvalidCredentialsError();
        }

        const { token, user } = resData.data;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl ?? null,
          backendToken: token,
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      checks: ["state"],
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const idToken = account.id_token;
        if (!idToken) {
          console.error("Google Sign-In Error: ID Token tidak ditemukan");
          return false;
        }
        try {
          const response = await fetch(`${API_URL}/api/auth/google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ idToken }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Gagal sinkronisasi dengan backend:", errorText);
            return false;
          }

          const resData = await response.json();
          if (resData.success && resData.data) {
            user.backendToken = resData.data.token;
            user.id = resData.data.user.id;
            return true;
          }
          return false;
        } catch (error) {
          console.error(
            "Kesalahan koneksi ke backend saat Google Sign-In:",
            error,
          );
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.backendToken = user.backendToken;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.backendToken = token.backendToken as string | undefined;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
