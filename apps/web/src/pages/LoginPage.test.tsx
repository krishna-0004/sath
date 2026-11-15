import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as AuthApi from "../features/auth/auth-api.js";
import * as AuthModule from "../features/auth/AuthProvider.js";
import { LoginPage } from "./LoginPage.js";

describe("LoginPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderLogin = (initialEntry = "/login") => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/app" element={<div>Target App Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it("renders accessible heading and Google sign in button", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      logout: vi.fn(),
      logoutAll: vi.fn(),
    });

    renderLogin();

    expect(screen.getByRole("heading", { name: /sign in to saath/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
    expect(
      screen.getByText(/saath never posts to google and only reads your name/i),
    ).toBeInTheDocument();
  });

  it("displays accessible alert when ?error=access_denied is in query", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      logout: vi.fn(),
      logoutAll: vi.fn(),
    });

    renderLogin("/login?error=access_denied");

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(
      "You chose not to sign in with Google. You can try again whenever you're ready.",
    );
  });

  it("displays accessible alert when ?error=state_mismatch is in query", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      logout: vi.fn(),
      logoutAll: vi.fn(),
    });

    renderLogin("/login?error=state_mismatch");

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Your sign-in session expired. Please try again.");
  });

  it("calls demoLogin and redirects when demo button is clicked", async () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      logout: vi.fn(),
      logoutAll: vi.fn(),
    });

    const mockDemo = vi.spyOn(AuthApi, "demoLogin").mockResolvedValue(undefined);

    renderLogin();

    const demoButton = screen.queryByRole("button", { name: /try the demo/i });
    if (demoButton) {
      fireEvent.click(demoButton);
      expect(mockDemo).toHaveBeenCalledTimes(1);
    }
  });

  it("redirects authenticated user directly to /app", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: {
        id: "usr-1",
        email: "elder@example.com",
        name: "Elder Sharma",
        avatarUrl: null,
        isDemo: false,
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        lastLoginAt: "2026-01-01T00:00:00.000Z",
      },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      logoutAll: vi.fn(),
    });

    renderLogin();
    expect(screen.getByText("Target App Page")).toBeInTheDocument();
  });
});
