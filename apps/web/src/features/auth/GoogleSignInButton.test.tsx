import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleSignInButton } from "./GoogleSignInButton.js";

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has accessible name 'Sign in with Google' and >= 76px touch target", () => {
    render(<GoogleSignInButton />);

    const button = screen.getByRole("button", { name: /sign in with google/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAccessibleName("Sign in with Google");

    // Meets primary elder touch target requirement >= 76px
    expect(button.className).toContain("min-h-[76px]");
  });

  it("navigates to /api/auth/google with properly encoded returnTo on click", () => {
    const locationSpy = { href: "" };
    const locationMock = vi
      .spyOn(window, "location", "get")
      .mockReturnValue(locationSpy as unknown as Location);

    render(<GoogleSignInButton returnTo="/app/medications?view=daily" />);

    const button = screen.getByRole("button", { name: /sign in with google/i });
    fireEvent.click(button);

    expect(locationSpy.href).toBe("/api/auth/google?returnTo=%2Fapp%2Fmedications%3Fview%3Ddaily");

    locationMock.mockRestore();
  });

  it("defaults returnTo to /app when not provided", () => {
    const locationSpy = { href: "" };
    const locationMock = vi
      .spyOn(window, "location", "get")
      .mockReturnValue(locationSpy as unknown as Location);

    render(<GoogleSignInButton />);

    const button = screen.getByRole("button", { name: /sign in with google/i });
    fireEvent.click(button);

    expect(locationSpy.href).toBe("/api/auth/google?returnTo=%2Fapp");

    locationMock.mockRestore();
  });
});
