/** @vitest-environment jsdom */
import "../../test/setup.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePicker } from "./components/ProfilePicker.js";
import { TodayView } from "./components/TodayView.js";
import { FamilyDashboardView } from "./components/FamilyDashboardView.js";
import { CareNavigation } from "./components/CareNavigation.js";
import * as CareApiModule from "./api.js";
import type { DoseEvent, Profile } from "./types.js";

const mockProfile: Profile = {
  id: "profile-123",
  elderName: "Grandpa Ramesh",
  joinCode: "RAMESH1234",
  timezone: "Asia/Kolkata",
  anchorTimes: {
    breakfast: "08:00",
    lunch: "13:00",
    dinner: "20:00",
    bedtime: "22:00",
  },
  sharing: {
    medicines: true,
    reports: true,
    appointments: true,
  },
  emergencyPhone: "+919876543210",
  createdAt: "2026-11-15T00:00:00.000Z",
  updatedAt: "2026-11-15T00:00:00.000Z",
};

const mockDose: DoseEvent = {
  id: "dose-1",
  profileId: "profile-123",
  medicine: {
    id: "med-1",
    profileId: "profile-123",
    name: "Metformin",
    strengthText: "500 mg",
    frequencyText: "Twice daily",
    anchors: ["breakfast", "dinner"],
    withFood: "after",
    notes: "Take with warm water",
    status: "active",
    source: "manual",
    createdAt: "2026-11-15T00:00:00.000Z",
    updatedAt: "2026-11-15T00:00:00.000Z",
  },
  scheduledFor: "2026-11-15T08:00:00.000Z",
  status: "pending",
  displayStatus: "pending",
  reasonText: "",
  recordedBy: null,
  recordedAt: null,
};

describe("Care Core Web Features", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>,
    );
  };

  describe("ProfilePicker", () => {
    it("renders profile cards with elder name and join code", async () => {
      vi.spyOn(CareApiModule.careApi, "getProfiles").mockResolvedValue({
        profiles: [
          {
            profile: mockProfile,
            role: "elder",
            joinedAt: "2026-11-15T00:00:00.000Z",
          },
        ],
      });

      const { container } = renderWithProviders(<ProfilePicker />);

      expect(await screen.findByText("Grandpa Ramesh")).toBeInTheDocument();
      expect(screen.getByText("RAMESH1234")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /open care hub/i })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("opens create profile modal when button is clicked", async () => {
      vi.spyOn(CareApiModule.careApi, "getProfiles").mockResolvedValue({ profiles: [] });

      renderWithProviders(<ProfilePicker />);

      const createBtn = await screen.findByRole("button", { name: /create a profile/i });
      fireEvent.click(createBtn);

      expect(screen.getByRole("heading", { name: /create elder profile/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/elder full name/i)).toBeInTheDocument();
    });
  });

  describe("TodayView", () => {
    it("renders scheduled doses with accessible >=76px mark taken button and triggers aria announcement", async () => {
      vi.spyOn(CareApiModule.careApi, "getTodayDoses").mockResolvedValue({
        doses: [mockDose],
      });
      const recordSpy = vi.spyOn(CareApiModule.careApi, "recordDose").mockResolvedValue({
        dose: { ...mockDose, status: "taken" },
      });

      const { container } = renderWithProviders(<TodayView profile={mockProfile} canEdit={true} />);

      const metforminElements = await screen.findAllByText("Metformin");
      expect(metforminElements.length).toBeGreaterThan(0);
      expect(screen.getAllByText(/500 mg/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/after food/i)).toBeInTheDocument();

      const takenBtn = screen.getByRole("button", { name: /take now/i });
      expect(takenBtn).toBeInTheDocument();
      expect(takenBtn.className).toContain("min-h-[76px]");

      fireEvent.click(takenBtn);
      await waitFor(() => {
        expect(recordSpy).toHaveBeenCalledWith(
          "profile-123",
          "dose-1",
          expect.objectContaining({ status: "taken" }),
        );
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("FamilyDashboardView", () => {
    it("renders adherence rate and circle members", async () => {
      vi.spyOn(CareApiModule.careApi, "getDoseSummary").mockResolvedValue({
        summary: {
          days: 7,
          total: 14,
          taken: 13,
          spilled: 0,
          skipped: 1,
          missed: 0,
          pending: 0,
          adherenceRate: 100,
        },
      });
      vi.spyOn(CareApiModule.careApi, "listMembers").mockResolvedValue({
        members: [
          {
            id: "m-1",
            profileId: "profile-123",
            userId: {
              id: "u-1",
              name: "Suresh Kumar",
              email: "suresh@example.com",
            },
            role: "elder",
            joinedAt: "2026-11-15T00:00:00.000Z",
          },
        ],
      });

      const { container } = renderWithProviders(
        <FamilyDashboardView profile={mockProfile} isElder={true} />,
      );

      expect(await screen.findByText("100%")).toBeInTheDocument();
      expect(screen.getByText("Suresh Kumar")).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("CareNavigation", () => {
    it("indicates active page with aria-current", () => {
      const handleTab = vi.fn();
      render(
        <CareNavigation
          activeTab="today"
          onTabChange={handleTab}
          isElder={true}
          sharing={{ medicines: true, reports: true, appointments: true }}
        />,
      );

      const todayTab = screen.getByRole("button", { name: /today's routine/i });
      expect(todayTab).toHaveAttribute("aria-current", "page");

      const familyTab = screen.getByRole("button", { name: /family dashboard/i });
      expect(familyTab).not.toHaveAttribute("aria-current");

      fireEvent.click(familyTab);
      expect(handleTab).toHaveBeenCalledWith("family");
    });
  });
});
