import React, { createContext, useCallback, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingState } from "../../components/ui/LoadingState.js";
import { getMe, logout as apiLogout, logoutAll as apiLogoutAll } from "./auth-api.js";
import type { AuthUser } from "./auth-types.js";

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await getMe();
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        const code = (err as { code?: string })?.code;
        if (
          status === 401 ||
          code === "UNAUTHENTICATED" ||
          code === "TOKEN_EXPIRED" ||
          code === "REFRESH_INVALID" ||
          code === "REFRESH_REUSED"
        ) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
    }
  }, [queryClient]);

  const logoutAll = useCallback(async () => {
    try {
      await apiLogoutAll();
    } finally {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value: AuthContextValue = {
    user: user ?? null,
    isLoading,
    isAuthenticated: Boolean(user),
    logout,
    logoutAll,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <LoadingState message="Checking your care session..." />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
