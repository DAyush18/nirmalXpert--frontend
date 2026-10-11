export type UserRole = "DEALER" | "CUSTOMER";

// name / email / phone are null until the user provides them (phone-first sign-up
// creates the account with only a phone number and a role).
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string | null;
  user: User;
}
