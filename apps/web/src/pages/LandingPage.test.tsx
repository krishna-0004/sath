import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LandingPage } from "./LandingPage.js";

describe("LandingPage", () => {
  const renderLanding = () =>
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

  it("renders product title, tagline, and landmarks", () => {
    renderLanding();

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Every prescription, every report, every emergency/i,
      }),
    ).toBeInTheDocument();
  });

  it("links sign in and demo actions to /login", () => {
    renderLanding();

    const links = screen.getAllByRole("link", { name: /sign in|try demo/i });
    expect(links.length).toBeGreaterThanOrEqual(2);
    links.forEach((link) => {
      expect(link).toHaveAttribute("href", "/login");
    });
  });

  it("ensures SkipLink is the first focusable element when pressing Tab", async () => {
    const user = userEvent.setup();
    renderLanding();

    await user.tab();

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toHaveFocus();
  });

  it("passes axe accessibility tests with zero violations", async () => {
    const { container } = renderLanding();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
