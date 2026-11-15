import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "./Toast.js";

function TestConsumer({
  message,
  type,
}: {
  message: string;
  type?: "info" | "error" | "success";
}): React.JSX.Element {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast(message, type)}>
      Trigger Toast
    </button>
  );
}

describe("Toast and ToastProvider", () => {
  it("renders status role with polite live region for info/success toasts", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer message="Prescription saved" type="success" />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Trigger Toast" }));

    const toast = screen.getByRole("status");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent("Prescription saved");
    expect(toast).toHaveAttribute("aria-live", "polite");
  });

  it("renders alert role with assertive live region for error toasts", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer message="Network request failed" type="error" />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Trigger Toast" }));

    const alertToast = screen.getByRole("alert");
    expect(alertToast).toBeInTheDocument();
    expect(alertToast).toHaveTextContent("Network request failed");
    expect(alertToast).toHaveAttribute("aria-live", "assertive");
  });

  it("dismisses toast when close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer message="Dismissable toast" type="info" />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Trigger Toast" }));
    expect(screen.getByRole("status")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /Dismiss notification/i });
    await act(async () => {
      await user.click(closeBtn);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
