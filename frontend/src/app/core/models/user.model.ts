export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
