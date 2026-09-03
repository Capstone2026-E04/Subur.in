import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { API_URL } from "@/services/api";

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: "/api/nextauth",
  providers: [
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
          console.error("Kesalahan koneksi ke backend saat Google Sign-In:", error);
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
