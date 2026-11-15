import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import { ToastProvider } from "../components/ui/Toast.js";

/**
 * Custom render helper that provides isolated QueryClient and ToastProvider contexts for tests.
 */
export function renderWithProviders(ui: React.ReactElement): RenderResult {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={testQueryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}
