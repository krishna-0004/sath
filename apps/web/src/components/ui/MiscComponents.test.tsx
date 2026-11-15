import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "./Badge.js";
import { Card } from "./Card.js";
import { EmptyState } from "./EmptyState.js";
import { ErrorState } from "./ErrorState.js";
import { LoadingState } from "./LoadingState.js";
import { SkipLink } from "./SkipLink.js";
import { Spinner } from "./Spinner.js";
import { VisuallyHidden } from "./VisuallyHidden.js";

describe("Miscellaneous UI Components", () => {
  it("Badge renders with correct variant style and passes axe", async () => {
    const { container } = render(<Badge variant="accent">New Update</Badge>);
    expect(screen.getByText("New Update")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("Card renders children within rounded container and passes axe", async () => {
    const { container } = render(
      <Card>
        <h2>Health Summary</h2>
        <p>Blood pressure normal.</p>
      </Card>,
    );
    expect(screen.getByText("Health Summary")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("VisuallyHidden renders accessible text with sr-only styling", () => {
    render(<VisuallyHidden>Screen reader instructions</VisuallyHidden>);
    const hiddenSpan = screen.getByText("Screen reader instructions");
    expect(hiddenSpan).toBeInTheDocument();
    expect(hiddenSpan.className).toContain("overflow-hidden");
  });

  it("SkipLink renders with accessible href to #main", () => {
    render(<SkipLink targetId="main" />);
    const link = screen.getByText("Skip to main content");
    expect(link).toHaveAttribute("href", "#main");
  });

  it("EmptyState renders title, description, and triggers action button", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="No Prescriptions"
        description="You have no active prescriptions."
        actionLabel="Add Prescription"
        onAction={onAction}
      />,
    );
    expect(screen.getByText("No Prescriptions")).toBeInTheDocument();
    const actionBtn = screen.getByRole("button", { name: "Add Prescription" });
    actionBtn.click();
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("ErrorState renders alert role, message, and triggers retry", () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="Failed to load"
        message="Please check your connection."
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: "Try again" });
    retryBtn.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("LoadingState renders status role with spinner", () => {
    render(<LoadingState message="Fetching data..." />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Fetching data...")).toBeInTheDocument();
  });

  it("Spinner renders SVG with role status and visually hidden label", () => {
    render(<Spinner label="Processing payment" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Processing payment")).toBeInTheDocument();
  });
});
