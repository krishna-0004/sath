import React from "react";
import {
  Sun,
  LayoutDashboard,
  Pill,
  FileText,
  Calendar,
  ClipboardList,
  Settings,
} from "lucide-react";

export type CareTab =
  "today" | "family" | "medicines" | "reports" | "appointments" | "brief" | "settings";

export interface CareNavigationProps {
  activeTab: CareTab;
  onTabChange: (tab: CareTab) => void;
  isElder: boolean;
  sharing: {
    medicines: boolean;
    reports: boolean;
    appointments: boolean;
  };
}

export function CareNavigation({
  activeTab,
  onTabChange,
  isElder,
  sharing,
}: CareNavigationProps): React.JSX.Element {
  const tabs: Array<{
    id: CareTab;
    label: string;
    icon: React.ReactNode;
    visible: boolean;
  }> = [
    {
      id: "today",
      label: "Today's Routine",
      icon: <Sun className="w-5 h-5 shrink-0" aria-hidden="true" />,
      visible: isElder || sharing.medicines,
    },
    {
      id: "family",
      label: "Family Dashboard",
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" aria-hidden="true" />,
      visible: true,
    },
    {
      id: "medicines",
      label: "Medicines",
      icon: <Pill className="w-5 h-5 shrink-0" aria-hidden="true" />,
      visible: isElder || sharing.medicines,
    },
    {
      id: "reports",
      label: "Lab Reports",
      icon: <FileText className="w-5 h-5 shrink-0" aria-hidden="true" />,
      visible: isElder || sharing.reports,
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: <Calendar className="w-5 h-5 shrink-0" aria-hidden="true" />,
      visible: isElder || sharing.appointments,
    },
    {
      id: "brief",
      label: "Doctor Brief",
      icon: <ClipboardList className="w-5 h-5 shrink-0" aria-hidden="true" />,
      visible: true,
    },
    {
      id: "settings",
      label: isElder ? "Settings & Circle" : "Circle Info",
      icon: <Settings className="w-5 h-5 shrink-0" aria-hidden="true" />,
      visible: true,
    },
  ];

  const visibleTabs = tabs.filter((t) => t.visible);

  return (
    <>
      {/* Desktop / Tablet Nav Bar */}
      <nav
        aria-label="Care Sections"
        className="hidden lg:flex items-center gap-2 overflow-x-auto pb-2 border-b border-line"
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold text-base whitespace-nowrap transition-all focus:outline-none focus:ring-4 focus:ring-primary-strong/30 press ${
                isActive
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface text-ink hover:bg-surface-2 border border-line"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-white ml-1" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile Fixed Bottom Tab Bar (< 1024px) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-line h-[72px] pb-[env(safe-area-inset-bottom)] flex items-center justify-around px-2 shadow-lg"
      >
        {visibleTabs.slice(0, 5).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-bold transition-colors ${
                isActive ? "text-primary" : "text-ink-muted hover:text-ink"
              }`}
            >
              <span
                className={`p-1 rounded-xl ${isActive ? "bg-primary-soft text-primary-strong" : ""}`}
              >
                {tab.icon}
              </span>
              <span className="truncate max-w-[64px] text-[11px] mt-0.5">
                {tab.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
