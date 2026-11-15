import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { LoadingState } from "../components/ui/LoadingState.js";
import { SkipLink } from "../components/ui/SkipLink.js";
import { UserMenu } from "../features/auth/index.js";
import {
  AppointmentsView,
  CareNavigation,
  type CareTab,
  FamilyDashboardView,
  MedicinesView,
  SettingsView,
  TodayView,
  useProfile,
} from "../features/care/index.js";

export function ProfilePage(): React.JSX.Element {
  const { profileId } = useParams<{ profileId: string }>();
  const [activeTab, setActiveTab] = useState<CareTab>("today");

  const { data, isLoading, error } = useProfile(profileId || "");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <LoadingState message="Loading care hub..." />
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <Card className="max-w-md w-full p-8 text-center bg-white border border-stone-200 rounded-3xl shadow-sm">
          <div
            className="h-12 w-12 mx-auto mb-3 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xl"
            aria-hidden="true"
          >
            !
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Profile Not Accessible</h2>
          <p className="text-stone-600 text-base mb-6">
            You may not be an active member of this care circle or the profile may have been
            removed.
          </p>
          <Link
            to="/app"
            className="inline-block w-full py-3 px-4 bg-teal-800 text-white font-bold rounded-2xl hover:bg-teal-900 transition-colors focus:ring-4 focus:ring-teal-700/30"
          >
            Return to Profiles
          </Link>
        </Card>
      </div>
    );
  }

  const { profile, role } = data;
  const isElder = role === "elder";
  const canEdit = role === "elder" || role === "editor";

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <SkipLink targetId="main" />

      {/* Header Landmark */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              aria-label="Back to all profiles"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-sm font-bold mr-2"
            >
              ← Circles
            </Link>
            <div
              className="h-10 w-10 rounded-xl bg-teal-800 flex items-center justify-center text-white font-bold text-xl select-none"
              aria-hidden="true"
            >
              S
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-teal-950">
                {profile.elderName}
              </span>
              <span className="text-xs text-stone-500 font-medium">Care Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant={isElder ? "primary" : "neutral"}>
              {role === "elder" ? "Elder (Owner)" : role === "editor" ? "Editor" : "Viewer"}
            </Badge>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Landmark */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 focus:outline-none space-y-8"
      >
        <CareNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isElder={isElder}
          sharing={profile.sharing}
        />

        <div>
          {activeTab === "today" && <TodayView profile={profile} canEdit={canEdit} />}
          {activeTab === "family" && <FamilyDashboardView profile={profile} isElder={isElder} />}
          {activeTab === "medicines" && <MedicinesView profile={profile} canEdit={canEdit} />}
          {activeTab === "appointments" && <AppointmentsView profile={profile} canEdit={canEdit} />}
          {activeTab === "settings" && <SettingsView profile={profile} isElder={isElder} />}
        </div>
      </main>
    </div>
  );
}
