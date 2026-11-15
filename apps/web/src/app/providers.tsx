import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider, useToast } from "../components/ui/Toast.js";
import { AuthProvider } from "../features/auth/index.js";
import { queryClient, setGlobalToastNotifier } from "./query-client.js";

function ToastConnector({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { showToast } = useToast();

  useEffect(() => {
    setGlobalToastNotifier(showToast);
  }, [showToast]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ToastConnector>
          <AuthProvider>{children}</AuthProvider>
        </ToastConnector>
      </ToastProvider>
    </QueryClientProvider>
  );
}
