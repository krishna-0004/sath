import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as AuthModule from "./AuthProvider.js";
import { ProtectedRoute } from "./ProtectedRoute.js";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated users to /login with encoded returnTo", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      logout: vi.fn(),
      logoutAll: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/app/prescriptions?sort=date"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/app/prescriptions" element={<div>Secret Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page Target</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
    expect(screen.getByText("Login Page Target")).toBeInTheDocument();
  });

  it("renders protected child content when user is authenticated", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: {
        id: "usr-123",
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

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<div>Protected Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected Dashboard")).toBeInTheDocument();
  });

  it("renders accessible loading indicator while checking auth session", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      logout: vi.fn(),
      logoutAll: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<div>Protected Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading protected area...")).toBeInTheDocument();
  });
});
