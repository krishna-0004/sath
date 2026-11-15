import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "../../components/ui/LoadingState.js";
import { useAuth } from "./AuthProvider.js";

export function ProtectedRoute(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <LoadingState message="Loading protected area..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = `${location.pathname}${location.search}`;
    const returnTo = encodeURIComponent(currentPath || "/app");
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return <Outlet />;
}
