/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { ScanConfirmModal } from "../src/features/care/components/ScanConfirmModal.js";
import { careApi } from "../src/features/care/api.js";

vi.mock("../src/features/care/api.js", () => ({
  careApi: {
    uploadPrescriptionOrReport: vi.fn(),
    previewPrescription: vi.fn(),
    confirmPrescription: vi.fn(),
  },
}));

describe("ScanConfirmModal Component Flow & Accessibility", () => {
  const profileId = "profile-123";
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeAll(() => {
    // jsdom HTMLMediaElement mock
    window.HTMLMediaElement.prototype.load = () => {};
    window.HTMLMediaElement.prototype.play = () => Promise.resolve();
    window.HTMLMediaElement.prototype.pause = () => {};
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload dropzone and passes axe accessibility audit", async () => {
    const { container } = render(
      <ScanConfirmModal
        isOpen={true}
        onClose={onClose}
        profileId={profileId}
        onSuccess={onSuccess}
      />,
    );

    expect(
      screen.getByRole("region", { name: /upload prescription document/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Drag prescription here or choose a file/i)).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("shows error alert on invalid file type", async () => {
    render(
      <ScanConfirmModal
        isOpen={true}
        onClose={onClose}
        profileId={profileId}
        onSuccess={onSuccess}
      />,
    );

    const input = document.getElementById("file-upload-input") as HTMLInputElement;
    const invalidFile = new File(["not an image"], "test.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Please upload a JPG, PNG, or PDF file/i);
    });
  });

  it("completes full scan, preview diff, editable fields, and confirm flow", async () => {
    const mockUploadRes = {
      uploadId: "upl-999",
      privateUrl: "https://example.com/asset.png",
      fileType: "image/png",
      bytes: 2048,
    };

    const mockPreviewRes = {
      diff: {
        added: [
          {
            name: "Atorvastatin",
            strengthText: "20mg",
            frequencyText: "once daily",
            anchors: ["bedtime" as const],
            withFood: null,
            instructions: "Take at bedtime",
          },
        ],
        updated: [
          {
            id: "med-metformin",
            name: "Metformin",
            strengthText: "1000mg",
            frequencyText: "twice daily",
            anchors: ["breakfast" as const, "dinner" as const],
            withFood: "with" as const,
            instructions: "Take with food",
          },
        ],
        unchanged: [
          {
            id: "med-aspirin",
            name: "Aspirin",
            strengthText: "75mg",
            frequencyText: "once daily",
            anchors: ["breakfast" as const],
            withFood: "with" as const,
            instructions: "",
          },
        ],
        possiblyDiscontinued: [
          {
            id: "med-amlodipine",
            name: "Amlodipine",
            strengthText: "5mg",
            frequencyText: "once daily",
            anchors: ["breakfast" as const],
          },
        ],
      },
      rawDoctorNotes: "Blood pressure normalized. Ask the doctor about this.",
      rawDateText: "15/11/2026",
    };

    const mockConfirmRes = {
      applied: {
        added: 1,
        updated: 1,
        stopped: 1,
      },
    };

    vi.mocked(careApi.uploadPrescriptionOrReport).mockResolvedValueOnce(mockUploadRes);
    vi.mocked(careApi.previewPrescription).mockResolvedValueOnce(mockPreviewRes);
    vi.mocked(careApi.confirmPrescription).mockResolvedValueOnce(mockConfirmRes);

    const { container } = render(
      <ScanConfirmModal
        isOpen={true}
        onClose={onClose}
        profileId={profileId}
        onSuccess={onSuccess}
      />,
    );

    // 1. Upload valid image
    const input = document.getElementById("file-upload-input") as HTMLInputElement;
    const validFile = new File(["fake-image-bytes"], "rx.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [validFile] } });

    // 2. Transition to preview with 4 distinct diff sections
    await waitFor(() => {
      expect(screen.getByText(/New Medicines \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Dose Changes \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Discontinued in New Prescription \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Unchanged Medicines \(1\)/i)).toBeInTheDocument();
    });

    // Check doctor notes
    expect(
      screen.getByText(/Blood pressure normalized. Ask the doctor about this./i),
    ).toBeInTheDocument();

    // Check accessibility of diff view
    const diffAxe = await axe(container);
    expect(diffAxe).toHaveNoViolations();

    // 3. Confirm Changes button
    const confirmBtn = screen.getByRole("button", { name: /Confirm changes/i });
    expect(confirmBtn).toHaveClass("min-h-[76px]"); // Touch target requirement >= 76px

    fireEvent.click(confirmBtn);

    // 4. Verify confirm API was called and success screen is shown
    await waitFor(() => {
      expect(careApi.confirmPrescription).toHaveBeenCalledWith(profileId, {
        applyAdded: mockPreviewRes.diff.added,
        applyUpdated: mockPreviewRes.diff.updated,
        stopDiscontinuedIds: ["med-amlodipine"],
      });
      expect(screen.getByText(/Medicines Updated!/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Successfully applied: 1 added, 1 updated, 1 stopped/i),
      ).toBeInTheDocument();
    });

    const returnBtn = screen.getByRole("button", { name: /Return to Today view/i });
    expect(returnBtn).toHaveClass("min-h-[76px]");

    fireEvent.click(returnBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
