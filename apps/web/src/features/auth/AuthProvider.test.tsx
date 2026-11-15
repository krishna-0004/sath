import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as AuthApi from "./auth-api.js";
import { AuthProvider, useAuth } from "./AuthProvider.js";

describe("AuthProvider and useAuth", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("throws error when useAuth is accessed outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });

  it("loads user profile and sets isAuthenticated to true", async () => {
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({
      id: "usr-99",
      email: "elder@saath.invalid",
      name: "Elder Ji",
      avatarUrl: null,
      isDemo: false,
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      lastLoginAt: "2026-01-01T00:00:00.000Z",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div>App Content Rendered</div>
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("App Content Rendered")).toBeInTheDocument();
  });

  it("handles 401 unauthenticated gracefully setting user to null", async () => {
    const error = new Error("Unauthenticated");
    (error as unknown as { status: number; code: string }).status = 401;
    (error as unknown as { status: number; code: string }).code = "UNAUTHENTICATED";
    vi.spyOn(AuthApi, "getMe").mockRejectedValue(error);

    let authContext: ReturnType<typeof useAuth> | undefined;

    function TestConsumer(): React.JSX.Element {
      authContext = useAuth();
      return <div>Unauthenticated Rendered</div>;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Unauthenticated Rendered")).toBeInTheDocument();
    expect(authContext?.isAuthenticated).toBe(false);
    expect(authContext?.user).toBeNull();
  });

  it("handles logout and logoutAll clearing query state", async () => {
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({
      id: "usr-99",
      email: "elder@saath.invalid",
      name: "Elder Ji",
      avatarUrl: null,
      isDemo: false,
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      lastLoginAt: "2026-01-01T00:00:00.000Z",
    });
    const mockLogout = vi.spyOn(AuthApi, "logout").mockResolvedValue(undefined);
    const mockLogoutAll = vi.spyOn(AuthApi, "logoutAll").mockResolvedValue(undefined);

    let authContext: ReturnType<typeof useAuth> | undefined;

    function TestConsumer(): React.JSX.Element {
      authContext = useAuth();
      return <div>Logged In Rendered</div>;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await screen.findByText("Logged In Rendered");

    await act(async () => {
      await authContext?.logout();
    });
    expect(mockLogout).toHaveBeenCalledTimes(1);

    await act(async () => {
      await authContext?.logoutAll();
    });
    expect(mockLogoutAll).toHaveBeenCalledTimes(1);
  });
});
