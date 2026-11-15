import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { UpstreamError } from "../errors/http-errors.js";

export interface ExtractedPrescriptionMedicine {
  name: string;
  strengthText: string;
  frequencyText: string;
  anchors: string[];
  withFood: boolean | null;
  instructions: string;
}

export interface PrescriptionExtractionResult {
  medicines: ExtractedPrescriptionMedicine[];
  rawDoctorNotes: string;
  rawDateText: string | null;
}

export interface ExtractedLabMetric {
  name: string;
  value: number | string;
  unit: string;
  referenceRangeText: string;
  flag: "normal" | "low" | "high" | "unknown";
}

export interface LabReportExtractionResult {
  testName: string;
  collectedAtText: string | null;
  metrics: ExtractedLabMetric[];
  rawNotes: string;
}

export const aiClientService = {
  async postToAi<T>(endpoint: string, payload: unknown, maxRetries = 2): Promise<T> {
    const url = `${env.AI_SERVICE_URL.replace(/\/$/, "")}${endpoint}`;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AI-Secret": env.AI_SERVICE_TOKEN,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        // On 503 from AI service, retry with backoff if attempts remain
        if (response.status === 503 && attempt < maxRetries) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          continue;
        }

        // Parse AppError envelope from AI service
        let errorData: { error?: { code?: string; message?: string } } | undefined;
        try {
          errorData = (await response.json()) as { error?: { code?: string; message?: string } };
        } catch {
          // Response body was not JSON
        }

        const message =
          errorData?.error?.message || `AI service returned status ${response.status}`;
        const code = errorData?.error?.code || "UPSTREAM_ERROR";
        throw new AppError(code, message, response.status >= 500 ? 502 : response.status);
      } catch (err: unknown) {
        if (err instanceof AppError) {
          throw err;
        }
        if (attempt < maxRetries) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          continue;
        }
        throw new UpstreamError(
          `AI service communication failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    throw new UpstreamError("AI service failed after maximum retry attempts");
  },

  async extractPrescription(input: {
    imageUrl?: string;
    base64Data?: string;
    mimeType?: string;
  }): Promise<PrescriptionExtractionResult> {
    return this.postToAi<PrescriptionExtractionResult>("/internal/extract/prescription", input);
  },

  async extractLabReport(input: {
    imageUrl?: string;
    base64Data?: string;
    mimeType?: string;
  }): Promise<LabReportExtractionResult> {
    return this.postToAi<LabReportExtractionResult>("/internal/extract/lab-report", input);
  },
};
