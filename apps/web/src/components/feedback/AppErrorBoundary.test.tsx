import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary.js";

function CrashChild(): React.JSX.Element {
  throw new Error("Intentional component crash");
}

describe("AppErrorBoundary", () => {
  it("renders fallback UI when child component throws", () => {
    // Suppress expected console.error from ErrorBoundary during test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AppErrorBoundary>
        <CrashChild />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go home" })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
