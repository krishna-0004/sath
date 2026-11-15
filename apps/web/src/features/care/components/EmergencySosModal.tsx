import React, { useState } from "react";
import { Modal } from "../../../components/ui/Modal.js";
import { careApi } from "../api.js";
import type { SosTriggerResponse } from "../types.js";

export interface EmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  elderName: string;
  emergencyPhone?: string | null;
}

export function EmergencySosModal({
  isOpen,
  onClose,
  profileId,
  elderName,
  emergencyPhone,
}: EmergencySosModalProps): React.JSX.Element {
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [sosResult, setSosResult] = useState<SosTriggerResponse | null>(null);

  const handleClose = (): void => {
    setIsSending(false);
    setErrorText("");
    setSosResult(null);
    onClose();
  };

  const handleConfirmSos = async (): Promise<void> => {
    setIsSending(true);
    setErrorText("");

    try {
      let locationText: string | undefined;
      let latitude: number | undefined;
      let longitude: number | undefined;

      // Attempt geolocation if available
      if ("geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
          locationText = `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;
        } catch {
          // Geolocation optional, never block SOS dispatch
        }
      }

      const res = await careApi.triggerSos(profileId, {
        locationText,
        latitude,
        longitude,
      });

      setSosResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch SOS alert";
      setErrorText(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Emergency SOS"
      description={`Immediate emergency alert for ${elderName}`}
    >
      <div className="space-y-6">
        {errorText && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-lg font-medium"
          >
            {errorText}
          </div>
        )}

        {!sosResult ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 text-lg leading-relaxed">
              <strong>Need urgent assistance?</strong> Pressing the red button will instantly alert
              doctor contacts via WhatsApp and email, and generate a secure 24-hour medical info
              link.
            </div>

            {emergencyPhone && (
              <a
                href={`tel:${emergencyPhone}`}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 min-h-[76px] rounded-2xl bg-slate-900 text-white font-extrabold text-2xl hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-400 shadow-md transition-all active:scale-[0.98]"
              >
                <span>📞 Call Emergency: {emergencyPhone}</span>
              </a>
            )}

            <button
              type="button"
              disabled={isSending}
              onClick={() => void handleConfirmSos()}
              className="w-full flex items-center justify-center gap-3 px-8 py-6 min-h-[76px] rounded-2xl bg-red-700 text-white font-black text-2xl hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-400 shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span className="text-3xl" aria-hidden="true">
                🚨
              </span>
              <span>{isSending ? "Sending SOS..." : "CONFIRM SOS ALERT"}</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-4 min-h-[56px] text-slate-600 font-bold text-lg hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-2">
              <span className="text-5xl" aria-hidden="true">
                🚨
              </span>
              <h3 className="text-2xl font-black text-red-950">SOS Dispatched!</h3>
              <p className="text-lg text-red-900">
                Alert sent at {new Date(sosResult.triggeredAt).toLocaleTimeString()}.
              </p>
            </div>

            {/* Direct WhatsApp Doctor Links */}
            {sosResult.whatsappLinks.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xl font-bold text-slate-900">Notify Doctors on WhatsApp</h4>
                <div className="space-y-2">
                  {sosResult.whatsappLinks.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between px-6 py-4 min-h-[76px] rounded-2xl bg-emerald-700 text-white font-bold text-lg hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-300 shadow-sm transition-all"
                    >
                      <span>💬 Send SOS to {doc.doctorName}</span>
                      <span className="text-sm bg-emerald-800 px-3 py-1 rounded-full">
                        {doc.kind === "emergency_doctor" ? "Emergency" : "Family Doctor"}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Public Emergency Share Link */}
            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
              <p className="text-base font-bold text-slate-800">
                Secure 24-Hour Medical Info Link for First Responders:
              </p>
              <input
                type="text"
                readOnly
                aria-label="Secure 24-Hour Medical Info Link"
                value={sosResult.shareUrl}
                className="w-full p-3 rounded-xl border border-slate-300 bg-white font-mono text-sm text-slate-700 select-all"
              />
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handleClose}
                className="px-8 py-4 min-h-[76px] rounded-2xl bg-slate-900 text-white font-bold text-xl hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 transition-all"
              >
                Close SOS Dialog
              </button>
            </div>
          </div>
        )}
        <p className="text-xs text-ink-muted text-center pt-2">
          Saath does not replace emergency services or medical advice.
        </p>
      </div>
    </Modal>
  );
}
