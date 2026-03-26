import { User } from './user.model';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  organizationName: string;
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
