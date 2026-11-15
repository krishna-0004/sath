import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Button } from "./Button.js";

describe("Button Component", () => {
  it("renders with default type button and text", () => {
    render(<Button>Confirm Dose</Button>);
    const button = screen.getByRole("button", { name: "Confirm Dose" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "button");
  });

  it("applies primary touch target size (min-h-[76px]) when size is primary", () => {
    render(<Button size="primary">Emergency Call</Button>);
    const button = screen.getByRole("button", { name: "Emergency Call" });
    expect(button.className).toContain("min-h-[76px]");
  });

  it("applies secondary touch target size (min-h-[56px]) by default", () => {
    render(<Button>Daily Checklist</Button>);
    const button = screen.getByRole("button", { name: "Daily Checklist" });
    expect(button.className).toContain("min-h-[56px]");
  });

  it("disables button and displays spinner when loading is true", () => {
    render(<Button loading>Saving Record</Button>);
    const button = screen.getByRole("button", { name: /Saving Record/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders distinct variants (primary, secondary, danger, sos)", () => {
    const { rerender } = render(<Button variant="sos">SOS</Button>);
    expect(screen.getByRole("button", { name: "SOS" }).className).toContain("bg-red-600");

    rerender(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain("bg-red-700");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Button variant="primary">Accessible Action</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
