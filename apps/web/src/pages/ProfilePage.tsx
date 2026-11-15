import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Eye, Bell } from "lucide-react";
import { Badge } from "../components/ui/Badge.js";
import { Card } from "../components/ui/Card.js";
import { LoadingState } from "../components/ui/LoadingState.js";
import { SkipLink } from "../components/ui/SkipLink.js";
import { UserMenu } from "../features/auth/index.js";
import { PreferencesModal } from "../features/preferences/PreferencesModal.js";
import {
  AppointmentsView,
  CareBriefView,
  CareNavigation,
  type CareTab,
  EmergencySosModal,
  FamilyDashboardView,
  MedicinesView,
  ReportsView,
  SettingsView,
  TodayView,
  useProfile,
} from "../features/care/index.js";

export function ProfilePage(): React.JSX.Element {
  const { profileId } = useParams<{ profileId: string }>();
  const [activeTab, setActiveTab] = useState<CareTab>("today");
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  const { data, isLoading, error } = useProfile(profileId || "");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <LoadingState message="Loading care hub..." />
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-canvas">
        <Card className="max-w-md w-full p-8 text-center bg-surface border border-line rounded-[28px] shadow-sm">
          <div
            className="h-14 w-14 mx-auto mb-3 rounded-full bg-danger-soft text-danger flex items-center justify-center font-bold text-2xl"
            aria-hidden="true"
          >
            !
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">Profile Not Accessible</h2>
          <p className="text-ink-muted text-base mb-6">
            You may not be an active member of this care circle or the profile may have been
            removed.
          </p>
          <Link
            to="/app"
            className="inline-block w-full py-4 px-6 bg-primary text-white font-bold rounded-full hover:bg-primary-strong transition-colors focus:ring-4 focus:ring-primary-strong/30"
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
    <div className="min-h-screen flex flex-col bg-canvas text-ink relative">
      <SkipLink targetId="main" />

      {/* Header Landmark */}
      <header className="border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              aria-label="Back to all profiles"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-ink hover:bg-surface-2 text-sm font-bold mr-2"
            >
              ← Circles
            </Link>
            <div
              className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xl select-none"
              aria-hidden="true"
            >
              S
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-ink font-display">
                {profile.elderName}
              </span>
              <span className="text-xs text-ink-muted font-semibold">Care Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Display and accessibility preferences"
              onClick={() => setIsPreferencesOpen(true)}
              className="p-2.5 rounded-full border border-line text-ink-muted hover:text-ink hover:bg-surface-2 focus:outline-none focus:ring-4 focus:ring-primary-strong/30 transition-colors"
            >
              <Eye className="w-5 h-5" aria-hidden="true" />
            </button>

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
        className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 focus:outline-none space-y-8 pb-28 lg:pb-12 fade-up"
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
          {activeTab === "reports" && (
            <ReportsView profile={profile} canEdit={canEdit} isElder={isElder} />
          )}
          {activeTab === "appointments" && <AppointmentsView profile={profile} canEdit={canEdit} />}
          {activeTab === "brief" && <CareBriefView profile={profile} />}
          {activeTab === "settings" && <SettingsView profile={profile} isElder={isElder} />}
        </div>
      </main>

      {/* Floating 76px SOS Button */}
      {canEdit && (
        <aside aria-label="Emergency Action" className="fixed bottom-24 lg:bottom-8 right-6 z-30">
          <div className="relative flex items-center justify-center">
            {/* Soft pulse ring (static under reduced-motion) */}
            <span
              className="absolute w-24 h-24 rounded-full bg-danger/20 animate-ping pointer-events-none"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setIsSosModalOpen(true)}
              aria-label="Emergency SOS — Trigger immediate alert"
              className="relative w-[76px] h-[76px] rounded-full bg-danger text-white flex flex-col items-center justify-center shadow-2xl hover:bg-[#A32020] active:scale-95 focus:outline-none focus:ring-4 focus:ring-danger-soft transition-all cursor-pointer border-2 border-white"
            >
              <Bell className="w-7 h-7 stroke-2 animate-bounce" aria-hidden="true" />
              <span className="text-[11px] font-black tracking-wider uppercase">SOS</span>
            </button>
          </div>
        </aside>
      )}

      {/* Emergency SOS Modal */}
      <EmergencySosModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        profileId={profile.id}
        elderName={profile.elderName}
        emergencyPhone={profile.emergencyPhone}
      />

      {/* Accessibility Preferences Modal */}
      <PreferencesModal isOpen={isPreferencesOpen} onClose={() => setIsPreferencesOpen(false)} />
    </div>
  );
}
