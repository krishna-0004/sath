export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isDemo: boolean;
  status: "active" | "disabled";
  createdAt: string;
  lastLoginAt: string;
}
