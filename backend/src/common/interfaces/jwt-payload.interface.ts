import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  sessionId: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
}
