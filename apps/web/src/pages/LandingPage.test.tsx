import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { LandingPage } from "./LandingPage.js";

describe("LandingPage", () => {
  it("renders product title, tagline, and landmarks", () => {
    render(<LandingPage />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Every prescription, every report, every emergency/i,
      }),
    ).toBeInTheDocument();
  });

  it("marks placeholder buttons with aria-disabled", () => {
    render(<LandingPage />);

    const googleBtn = screen.getByRole("button", { name: "Sign in with Google" });
    const demoBtn = screen.getByRole("button", { name: "Try demo" });

    expect(googleBtn).toHaveAttribute("aria-disabled", "true");
    expect(demoBtn).toHaveAttribute("aria-disabled", "true");
  });

  it("ensures SkipLink is the first focusable element when pressing Tab", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    await user.tab();

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toHaveFocus();
  });

  it("passes axe accessibility tests with zero violations", async () => {
    const { container } = render(<LandingPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
