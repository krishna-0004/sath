import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, HeartHandshake } from "lucide-react";
import { Badge } from "../components/ui/Badge.js";
import { SkipLink } from "../components/ui/SkipLink.js";
import { HeroBlob } from "../components/illustrations/HeroBlob.js";
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
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <SkipLink targetId="main" />

      {/* Header */}
      <header className="border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-1"
          >
            <div
              className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-2xl select-none"
              aria-hidden="true"
            >
              S
            </div>
            <span className="text-2xl font-black tracking-tight text-ink font-display">Saath</span>
          </Link>
          <Badge variant="primary">Elder-First Care</Badge>
        </div>
      </header>

      {/* Main Container: Two-column on desktop, single on mobile */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 flex items-center justify-center p-6 lg:p-12 focus:outline-none"
      >
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-[28px] border border-line bg-surface shadow-xl overflow-hidden">
          {/* Left Column: Warm Brand Promise Panel (Desktop only) */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-primary-soft to-amber-soft/60 p-10 flex-col justify-between relative overflow-hidden border-r border-line">
            <div className="absolute -bottom-10 -right-10 w-64 h-64 opacity-50 pointer-events-none">
              <HeroBlob />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-primary-strong shadow-xs">
                <HeartHandshake className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="text-3xl font-black text-ink font-display leading-tight">
                Care, coordinate, and stay close.
              </h2>
              <p className="text-base text-ink-muted leading-relaxed">
                “With Saath, Dad never misses a dose, and our whole family stays informed without
                taking away his dignity.”
              </p>
            </div>

            <div className="space-y-2 text-xs text-ink-muted relative z-10">
              <p className="flex items-center gap-1.5 font-bold text-primary-strong">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Zero unsolicited changes</span>
              </p>
              <p>Everything requires elder confirmation.</p>
            </div>
          </div>

          {/* Right Column: Sign in card */}
          <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-ink tracking-tight mb-2 font-display">
                Sign in to Saath
              </h1>
              <p className="text-ink-muted text-lg">
                Coordinate routines, medications, and emergencies in one calm place.
              </p>
            </div>

            {/* Accessible Error Alert */}
            {(errorMessage || demoError) && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-2xl bg-danger-soft border border-danger/30 text-danger text-base font-medium flex items-start gap-3"
              >
                <svg
                  className="h-6 w-6 text-danger shrink-0 mt-0.5"
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
                  className="min-h-[76px] w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-primary text-white font-bold text-xl hover:bg-primary-strong active:bg-[#083E3E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-strong focus-visible:ring-offset-2 transition-all cursor-pointer shadow-md disabled:opacity-50 press"
                >
                  {isDemoSubmitting ? "Connecting to demo..." : "Try the demo (instant access)"}
                </button>
              )}
            </div>

            {/* Privacy Note */}
            <p className="text-ink-muted text-center text-sm leading-relaxed">
              Saath never posts to Google and only reads your name, email and profile picture.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
