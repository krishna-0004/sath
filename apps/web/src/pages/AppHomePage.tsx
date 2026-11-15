import React from "react";
import { Badge } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { SkipLink } from "../components/ui/SkipLink.js";
import { useAuth, UserMenu } from "../features/auth/index.js";

export function AppHomePage(): React.JSX.Element {
  const { user } = useAuth();
  const displayName = user?.name || "Caregiver";

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <SkipLink targetId="main" />

      {/* Header Landmark */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold text-xl select-none"
              aria-hidden="true"
            >
              S
            </div>
            <span className="text-2xl font-bold tracking-tight text-teal-900">Saath</span>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="primary">Phase 1 Auth Active</Badge>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Landmark */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 focus:outline-none"
      >
        <div className="mb-8">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-stone-950 tracking-tight mb-3">
            Welcome, {displayName}
          </h1>
          <p className="text-stone-600 text-lg">
            Signed in as <span className="font-semibold text-stone-800">{user?.email}</span>
            {user?.isDemo && <span className="ml-2 text-teal-800 font-bold">(Demo Account)</span>}
          </p>
        </div>

        <Card className="max-w-2xl bg-white border-2 border-stone-200 p-8 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-10 w-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold"
              aria-hidden="true"
            >
              ✓
            </div>
            <h2 className="text-2xl font-bold text-stone-900">
              Authentication & Security Core Active
            </h2>
          </div>
          <p className="text-stone-700 text-lg leading-relaxed mb-4">
            Your profiles and medication schedule will appear here.
          </p>
          <p className="text-stone-500 text-base leading-relaxed">
            Phase 2 will introduce elder and caregiver profile management, permission boundaries,
            and shared family circles.
          </p>
        </Card>
      </main>
    </div>
  );
}
