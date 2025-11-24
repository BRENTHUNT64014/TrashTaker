import NextAuth, { DefaultSession } from 'next-auth';
import { UserRole } from './types/enums';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      territory?: string;
    } & DefaultSession['user'];
    accessToken?: string;
    refreshToken?: string;
  }

  interface User {
    role: UserRole;
    territory?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole;
    territory?: string;
    accessToken?: string;
    refreshToken?: string;
  }
}
