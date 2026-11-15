import React from "react";
import { Eye, Type } from "lucide-react";
import { Modal } from "../../components/ui/Modal.js";
import { usePreferences } from "./usePreferences.js";

export interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreferencesModal({ isOpen, onClose }: PreferencesModalProps): React.JSX.Element {
  const { isHighContrast, isLargeText, toggleTheme, toggleTextSize } = usePreferences();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Display & Accessibility"
      description="Customize text sizing and contrast for maximum clarity"
    >
      <div className="space-y-6">
        {/* Large Text Switch */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-2 border border-line">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center text-primary-strong">
              <Type className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <span id="label-text-size" className="text-lg font-bold text-ink block">
                Larger Text
              </span>
              <span className="text-sm text-ink-muted block">
                Increases base reading font to 22px
              </span>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isLargeText}
            aria-labelledby="label-text-size"
            onClick={toggleTextSize}
            className={`relative inline-flex h-10 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-primary-strong/30 ${
              isLargeText ? "bg-primary" : "bg-line"
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isLargeText ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* High Contrast Switch */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-2 border border-line">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-soft flex items-center justify-center text-ink">
              <Eye className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <span id="label-contrast" className="text-lg font-bold text-ink block">
                High Contrast
              </span>
              <span className="text-sm text-ink-muted block">
                Deep black background with crisp white text
              </span>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isHighContrast}
            aria-labelledby="label-contrast"
            onClick={toggleTheme}
            className={`relative inline-flex h-10 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-primary-strong/30 ${
              isHighContrast ? "bg-primary" : "bg-line"
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isHighContrast ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3 min-h-[56px] rounded-full bg-primary text-white font-bold text-lg hover:bg-primary-strong focus:outline-none focus:ring-4 focus:ring-primary-strong/30 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
