/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "jest-axe";
import { ReportLensModal } from "../src/features/care/components/ReportLensModal.js";
import { ReportsView } from "../src/features/care/components/ReportsView.js";
import { careApi } from "../src/features/care/api.js";
import type { Profile } from "../src/features/care/types.js";

vi.mock("../src/features/care/api.js", () => ({
  careApi: {
    uploadPrescriptionOrReport: vi.fn(),
    previewReport: vi.fn(),
    createReport: vi.fn(),
    getReports: vi.fn(),
    compareReportMetric: vi.fn(),
    deleteReport: vi.fn(),
  },
}));

describe("ReportLensModal & ReportsView Flow, Rule 9 & Accessibility", () => {
  const profileId = "profile-456";
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  const mockProfile: Profile = {
    id: profileId,
    elderName: "Dad",
    joinCode: "ABCDEF1234",
    timezone: "Asia/Kolkata",
    anchorTimes: {
      breakfast: "08:30",
      lunch: "13:00",
      dinner: "20:00",
      bedtime: "22:00",
    },
    sharing: {
      medicines: true,
      reports: true,
      appointments: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload dropzone and passes axe accessibility audit", async () => {
    const { container } = render(
      <ReportLensModal
        isOpen={true}
        onClose={onClose}
        profileId={profileId}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText(/Upload Lab Report or Blood Test/i)).toBeInTheDocument();
    expect(screen.getByText(/Supports JPG, PNG, and PDF up to 10MB/i)).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("extracts biomarkers via AI, displays neutral preview table and complies with Rule 9", async () => {
    vi.mocked(careApi.uploadPrescriptionOrReport).mockResolvedValue({
      uploadId: "mock-upload-999",
      privateUrl: "https://example.com/report.pdf",
      fileType: "application/pdf",
      bytes: 2048,
    });

    vi.mocked(careApi.previewReport).mockResolvedValue({
      uploadId: "mock-upload-999",
      preview: {
        title: "Comprehensive Metabolic Panel",
        testDate: "2026-11-10",
        labName: "City Diagnostics",
        notes: "Fasting 12 hours",
        metrics: [
          {
            name: "HbA1c",
            value: 6.8,
            unit: "%",
            referenceRangeText: "< 5.7 %",
            flag: "high",
          },
          {
            name: "Fasting Blood Sugar",
            value: 126,
            unit: "mg/dL",
            referenceRangeText: "70-99 mg/dL",
            flag: "high",
          },
          {
            name: "Creatinine",
            value: 0.9,
            unit: "mg/dL",
            referenceRangeText: "0.6-1.2 mg/dL",
            flag: "normal",
          },
        ],
      },
    });

    vi.mocked(careApi.createReport).mockResolvedValue({
      report: {
        id: "rep-1",
        profileId,
        title: "Comprehensive Metabolic Panel",
        testDate: "2026-11-10",
        labName: "City Diagnostics",
        fileUrl: "",
        notes: "",
        createdBy: "user-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: [
          {
            name: "HbA1c",
            value: 6.8,
            unit: "%",
            referenceRangeText: "< 5.7 %",
            flag: "high",
          },
        ],
      },
    });

    const { container } = render(
      <ReportLensModal
        isOpen={true}
        onClose={onClose}
        profileId={profileId}
        onSuccess={onSuccess}
      />,
    );

    const testFile = new File(["dummy pdf content"], "lab_report.pdf", {
      type: "application/pdf",
    });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Review Extracted Biomarkers/i)).toBeInTheDocument();
    });

    // Check biomarkers displayed
    expect(screen.getByText("HbA1c")).toBeInTheDocument();
    expect(screen.getByText("6.8 %")).toBeInTheDocument();
    expect(screen.getByText("Fasting Blood Sugar")).toBeInTheDocument();
    expect(screen.getByText("126 mg/dL")).toBeInTheDocument();
    expect(screen.getByText("Creatinine")).toBeInTheDocument();

    // Verify Rule 9 adherence: Neutral text present, no diagnostic adjectives
    const bodyText = container.textContent || "";
    expect(bodyText).toContain("Ask the doctor about this");
    expect(bodyText).toContain("Saath does not diagnose or give medical guidance");
    expect(bodyText.toLowerCase()).not.toContain("improved");
    expect(bodyText.toLowerCase()).not.toContain("worsened");

    // Check axe accessibility
    const reviewAxeResults = await axe(container);
    expect(reviewAxeResults).toHaveNoViolations();

    // Confirm and save
    const saveButton = screen.getByRole("button", { name: /confirm & save report/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(careApi.createReport).toHaveBeenCalledWith(
        profileId,
        expect.objectContaining({
          title: "Comprehensive Metabolic Panel",
          testDate: "2026-11-10",
          labName: "City Diagnostics",
        }),
      );
      expect(
        screen.getByRole("heading", { name: /Report Successfully Saved/i }),
      ).toBeInTheDocument();
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it("renders ReportsView with What Changed trend comparison and passes axe audit", async () => {
    vi.mocked(careApi.getReports).mockResolvedValue({
      reports: [
        {
          id: "rep-101",
          profileId,
          title: "Glycated Hemoglobin Test",
          testDate: "2026-11-12",
          labName: "Suburban Lab",
          fileUrl: "",
          notes: "",
          createdBy: "user-1",
          createdAt: "2026-11-12T10:00:00.000Z",
          updatedAt: "2026-11-12T10:00:00.000Z",
          metrics: [
            {
              name: "HbA1c",
              value: 6.8,
              unit: "%",
              referenceRangeText: "< 5.7 %",
              flag: "high",
            },
          ],
        },
      ],
    });

    vi.mocked(careApi.compareReportMetric).mockResolvedValue({
      metricName: "HbA1c",
      current: {
        reportId: "rep-101",
        title: "Glycated Hemoglobin Test",
        testDate: "2026-11-12",
        value: 6.8,
        unit: "%",
        flag: "high",
      },
      previous: {
        reportId: "rep-100",
        title: "Prior Test",
        testDate: "2026-05-10",
        value: 7.2,
        unit: "%",
        flag: "high",
      },
      comparison: {
        absoluteDiff: -0.4,
        percentDiff: -5.56,
        daysBetween: 186,
        neutralDiffText: "changed by -0.4 % from 2026-05-10",
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ReportsView profile={mockProfile} canEdit={true} isElder={true} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Glycated Hemoglobin Test")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /scan lab report/i })).toBeInTheDocument();
    expect(screen.getByText("HbA1c")).toBeInTheDocument();

    // Click HbA1c to view trend comparison
    fireEvent.click(screen.getByText("HbA1c"));

    await waitFor(() => {
      expect(
        screen.getByText(/Observation: changed by -0.4 % from 2026-05-10/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Ask the doctor about this/i)).toBeInTheDocument();
    });

    const axeResults = await axe(container);
    expect(axeResults).toHaveNoViolations();
  });
});
