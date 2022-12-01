import { Request } from 'express';
import { AuthenticationError } from 'apollo-server-express';
import { Role } from './role';

export const isAuthenticated = (req: Request) => {
  if (!req.session.user) {
    throw new AuthenticationError('Not authenticated');
  }
};

export const isAdmin = (req: any) => req.session.user?.roles.includes(Role.ADMIN);
