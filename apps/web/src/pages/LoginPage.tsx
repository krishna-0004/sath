import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "../components/ui/Badge.js";
import { SkipLink } from "../components/ui/SkipLink.js";
import { demoLogin, GoogleSignInButton, useAuth } from "../features/auth/index.js";
import { env } from "../lib/env.js";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You chose not to sign in with Google. You can try again whenever you're ready.",
  state_mismatch: "Your sign-in session expired. Please try again.",
  oauth_failed: "Could not sign in with Google. Please try again in a moment.",
  account_disabled: "This account has been disabled. Please contact support.",
};

export function LoginPage(): React.JSX.Element {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const returnTo = searchParams.get("returnTo") || "/app";
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] : null;

  const isDemoEnabled =
    import.meta.env.VITE_DEMO_LOGIN_ENABLED === "true" || env.VITE_DEMO_LOGIN_ENABLED === "true";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, navigate, returnTo]);

  const handleDemoClick = async (): Promise<void> => {
    setIsDemoSubmitting(true);
    setDemoError(null);
    try {
      await demoLogin();
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate(returnTo);
    } catch {
      setDemoError("Could not start demo session. Please try again.");
    } finally {
      setIsDemoSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <SkipLink targetId="main" />

      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-xl p-1"
          >
            <div
              className="h-10 w-10 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold text-xl select-none"
              aria-hidden="true"
            >
              S
            </div>
            <span className="text-2xl font-bold tracking-tight text-teal-900">Saath</span>
          </Link>
          <Badge variant="primary">Elder-First Care</Badge>
        </div>
      </header>

      {/* Main Container */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 flex items-center justify-center p-6 focus:outline-none"
      >
        <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-sm p-8 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-950 tracking-tight mb-3">
              Sign in to Saath
            </h1>
            <p className="text-stone-600 text-lg">
              Coordinate care, prescriptions, and emergencies in one calm place.
            </p>
          </div>

          {/* Accessible Error Alert */}
          {(errorMessage || demoError) && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-base font-medium flex items-start gap-3"
            >
              <svg
                className="h-6 w-6 text-red-600 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{errorMessage || demoError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4 mb-8">
            <GoogleSignInButton returnTo={returnTo} />

            {isDemoEnabled && (
              <button
                type="button"
                onClick={handleDemoClick}
                disabled={isDemoSubmitting}
                className="min-h-[76px] w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-teal-800 text-white font-bold text-xl hover:bg-teal-900 active:bg-teal-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-700 focus-visible:ring-offset-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isDemoSubmitting ? "Connecting to demo..." : "Try the demo (instant access)"}
              </button>
            )}
          </div>

          {/* Privacy Note */}
          <p className="text-stone-500 text-center text-sm leading-relaxed">
            Saath never posts to Google and only reads your name, email and profile picture.
          </p>
        </div>
      </main>
    </div>
  );
}
