import type { Request } from 'express';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthenticatedRequest = Request & {
  auth: {
    user: PublicUser;
    sessionId: string;
  };
};

export type SessionCredentials = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};
