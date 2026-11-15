import React, { useEffect, useId, useRef } from "react";
import { Button } from "./Button.js";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
}: ModalProps): React.JSX.Element | null {
  const titleId = useId();
  const descId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Focus the modal container
    modalRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Overlay */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close dialog backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs cursor-default w-full h-full border-none"
      />

      {/* Dialog container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 focus:outline-none max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 id={titleId} className="text-2xl font-bold text-stone-900 tracking-tight">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-stone-600 text-sm mt-1">
                {description}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full w-10 h-10 p-0 flex items-center justify-center text-stone-500 hover:text-stone-900"
          >
            ✕
          </Button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
