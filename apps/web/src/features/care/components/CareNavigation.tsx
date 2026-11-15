import React from "react";

export type CareTab = "today" | "family" | "medicines" | "reports" | "appointments" | "settings";

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
  const tabs: Array<{ id: CareTab; label: string; icon: string; visible: boolean }> = [
    {
      id: "today",
      label: "Today's Routine",
      icon: "☀️",
      visible: isElder || sharing.medicines,
    },
    {
      id: "family",
      label: "Family Dashboard",
      icon: "📊",
      visible: true,
    },
    {
      id: "medicines",
      label: "Medicines",
      icon: "💊",
      visible: isElder || sharing.medicines,
    },
    {
      id: "reports",
      label: "Lab Reports",
      icon: "🔬",
      visible: isElder || sharing.reports,
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: "📅",
      visible: isElder || sharing.appointments,
    },
    {
      id: "settings",
      label: isElder ? "Settings & Circle" : "Circle Info",
      icon: "⚙️",
      visible: true,
    },
  ];

  const visibleTabs = tabs.filter((t) => t.visible);

  return (
    <nav
      aria-label="Care Sections"
      className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200"
    >
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-base whitespace-nowrap transition-all focus:outline-none focus:ring-4 focus:ring-teal-700/30 ${
              isActive
                ? "bg-teal-800 text-white shadow-xs"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
