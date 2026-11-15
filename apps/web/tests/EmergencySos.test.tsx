/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { axe } from "jest-axe";
import { EmergencySosModal } from "../src/features/care/components/EmergencySosModal.js";
import { EmergencyPage } from "../src/pages/EmergencyPage.js";
import { careApi } from "../src/features/care/api.js";

vi.mock("../src/features/care/api.js", () => ({
  careApi: {
    triggerSos: vi.fn(),
    getEmergencyShare: vi.fn(),
  },
}));

describe("Emergency SOS Modal & Public Emergency View", () => {
  const profileId = "prof-sos-123";
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders EmergencySosModal, dispatches SOS and passes axe audit", async () => {
    vi.mocked(careApi.triggerSos).mockResolvedValue({
      emergencyId: "em-1",
      shareToken: "tok-123",
      shareUrl: "http://localhost:5173/emergency/tok-123",
      elderName: "Grandpa Sharma",
      emergencyPhone: "+919876543210",
      doctorContactsNotified: 1,
      whatsappLinks: [
        {
          doctorName: "Dr. Arvind",
          kind: "emergency_doctor",
          whatsappUrl: "https://wa.me/919988776655?text=SOS",
        },
      ],
      triggeredAt: new Date().toISOString(),
    });

    const { container } = render(
      <EmergencySosModal
        isOpen={true}
        onClose={onClose}
        profileId={profileId}
        elderName="Grandpa Sharma"
        emergencyPhone="+919876543210"
      />,
    );

    expect(screen.getByText(/Immediate emergency alert for Grandpa Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Call Emergency: \+919876543210/i)).toBeInTheDocument();

    const initialAxe = await axe(container);
    expect(initialAxe).toHaveNoViolations();

    // Trigger SOS
    const sosButton = screen.getByRole("button", { name: /confirm sos alert/i });
    fireEvent.click(sosButton);

    await waitFor(() => {
      expect(careApi.triggerSos).toHaveBeenCalledWith(profileId, expect.any(Object));
      expect(screen.getByText(/SOS Dispatched!/i)).toBeInTheDocument();
      expect(screen.getByText(/Send SOS to Dr. Arvind/i)).toBeInTheDocument();
    });

    const dispatchedAxe = await axe(container);
    expect(dispatchedAxe).toHaveNoViolations();
  });

  it("renders public EmergencyPage with medicines and doctor contacts, passing axe audit", async () => {
    vi.mocked(careApi.getEmergencyShare).mockResolvedValue({
      elderName: "Grandpa Sharma",
      emergencyPhone: "+919876543210",
      timezone: "Asia/Kolkata",
      medicines: [
        {
          name: "Metformin",
          strengthText: "500mg",
          frequencyText: "Twice daily",
          anchors: ["breakfast", "dinner"],
          withFood: "with",
          instructions: "Take with food",
        },
      ],
      doctorContacts: [
        {
          name: "Dr. Arvind",
          kind: "emergency_doctor",
          whatsappNumber: "+919988776655",
        },
      ],
      recentReports: [
        {
          title: "HbA1c Test",
          testDate: "2026-11-10",
          metrics: [
            {
              name: "HbA1c",
              value: 6.8,
              unit: "%",
              flag: "high",
            },
          ],
        },
      ],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/emergency/valid-tok"]}>
          <Routes>
            <Route path="/emergency/:token" element={<EmergencyPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Grandpa Sharma")).toBeInTheDocument();
      expect(screen.getByText(/Call Emergency Contact: \+919876543210/i)).toBeInTheDocument();
      expect(screen.getByText("Metformin")).toBeInTheDocument();
      expect(screen.getByText("Dr. Arvind")).toBeInTheDocument();
      expect(screen.getByText("HbA1c Test")).toBeInTheDocument();
    });

    const axeResults = await axe(container);
    expect(axeResults).toHaveNoViolations();
  });
});
