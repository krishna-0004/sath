import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "./RouteErrorBoundary.js";

vi.mock("react-router-dom", () => ({
  useRouteError: () => new Error("Failed route navigation"),
}));

describe("RouteErrorBoundary", () => {
  it("renders alert role with error message and reload button", () => {
    render(<RouteErrorBoundary />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Unable to display page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
  });
});
