import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      backendToken?: string;
    } & DefaultSession["user"];
  }

  interface User {
    backendToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    backendToken?: string;
  }
}
