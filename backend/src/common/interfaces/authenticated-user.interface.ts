import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
}
