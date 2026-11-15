import React from "react";
import { Badge } from "../components/ui/Badge.js";
import { SkipLink } from "../components/ui/SkipLink.js";
import { useAuth, UserMenu } from "../features/auth/index.js";
import { ProfilePicker } from "../features/care/index.js";

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
              className="h-10 w-10 rounded-xl bg-teal-800 flex items-center justify-center text-white font-bold text-xl select-none"
              aria-hidden="true"
            >
              S
            </div>
            <span className="text-2xl font-bold tracking-tight text-teal-900">Saath</span>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="primary">Care Core Active</Badge>
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
          <h1 className="text-3xl sm:text-5xl font-extrabold text-stone-950 tracking-tight mb-2">
            Welcome, {displayName}
          </h1>
          <p className="text-stone-600 text-lg">
            Signed in as <span className="font-semibold text-stone-800">{user?.email}</span>
            {user?.isDemo && <span className="ml-2 text-teal-800 font-bold">(Demo Account)</span>}
          </p>
        </div>

        <ProfilePicker />
      </main>
    </div>
  );
}
