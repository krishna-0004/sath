import React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn.js";

export interface StepItem {
  id: string;
  label: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStepIndex: number;
  className?: string;
}

export function Stepper({ steps, currentStepIndex, className }: StepperProps): React.JSX.Element {
  return (
    <nav aria-label="Progress" className={cn("w-full py-2", className)}>
      <ol className="flex items-center justify-between w-full">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <li key={step.id} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                    isCompleted
                      ? "bg-primary text-white"
                      : isCurrent
                        ? "bg-primary-soft text-primary-strong border-2 border-primary-strong"
                        : "bg-surface-2 text-ink-muted border border-line",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-3" aria-hidden="true" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold mt-1 text-center",
                    isCurrent ? "text-primary-strong" : "text-ink-muted",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-full flex-1 transition-colors",
                    idx < currentStepIndex ? "bg-primary" : "bg-line",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
