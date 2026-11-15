import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServerWakingBanner } from "./ServerWakingBanner.js";

describe("ServerWakingBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows waking banner after 3 seconds when health check is pending", async () => {
    // Hanging fetch promise
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(<ServerWakingBanner />);

    // Initially not visible
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    // Advance timers by 3500ms
    act(() => {
      vi.advanceTimersByTime(3500);
    });

    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/Waking up the server/i);
  });
});
