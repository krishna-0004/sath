import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as AuthModule from "./AuthProvider.js";
import { UserMenu } from "./UserMenu.js";

describe("UserMenu", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when user is not authenticated", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      logout: vi.fn(),
      logoutAll: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders user initials when avatarUrl is absent", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: {
        id: "usr-1",
        email: "dadi@saath.invalid",
        name: "Dadi Ji",
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
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /user menu for dadi ji/i })).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByText("Dadi Ji")).toBeInTheDocument();
  });

  it("opens popup menu and handles Escape key", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: {
        id: "usr-1",
        email: "dadi@saath.invalid",
        name: "Dadi Ji",
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
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: /user menu for dadi ji/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /sign out$/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /sign out everywhere/i })).toBeInTheDocument();

    // Pressing Escape closes menu
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls logout and logoutAll handlers", async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    const mockLogoutAll = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: {
        id: "usr-1",
        email: "dadi@saath.invalid",
        name: "Dadi Ji",
        avatarUrl: null,
        isDemo: false,
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        lastLoginAt: "2026-01-01T00:00:00.000Z",
      },
      isLoading: false,
      isAuthenticated: true,
      logout: mockLogout,
      logoutAll: mockLogoutAll,
    });

    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /user menu for dadi ji/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /sign out$/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
