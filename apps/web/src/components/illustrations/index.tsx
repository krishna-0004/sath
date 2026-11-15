import React from "react";

export function EmptyMedicines(): React.JSX.Element {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24 mx-auto" aria-hidden="true" fill="none">
      <circle cx="60" cy="60" r="50" className="fill-amber-soft" />
      <rect
        x="42"
        y="36"
        width="36"
        height="52"
        rx="18"
        className="stroke-primary fill-surface stroke-2"
      />
      <line x1="42" y1="62" x2="78" y2="62" className="stroke-primary stroke-2" />
      <circle cx="60" cy="48" r="3" className="fill-primary" />
    </svg>
  );
}

export function EmptyReports(): React.JSX.Element {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24 mx-auto" aria-hidden="true" fill="none">
      <circle cx="60" cy="60" r="50" className="fill-primary-soft" />
      <rect
        x="40"
        y="32"
        width="40"
        height="56"
        rx="6"
        className="stroke-primary-strong fill-surface stroke-2"
      />
      <line
        x1="50"
        y1="46"
        x2="70"
        y2="46"
        className="stroke-line stroke-2"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="58"
        x2="66"
        y2="58"
        className="stroke-line stroke-2"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="70"
        x2="62"
        y2="70"
        className="stroke-line stroke-2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyFamily(): React.JSX.Element {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24 mx-auto" aria-hidden="true" fill="none">
      <circle cx="60" cy="60" r="50" className="fill-amber-soft" />
      <circle cx="60" cy="46" r="14" className="stroke-primary fill-surface stroke-2" />
      <path
        d="M38,82 C38,70 48,64 60,64 C72,64 82,70 82,82"
        className="stroke-primary stroke-2 fill-none"
      />
    </svg>
  );
}

export function EmptyAppointments(): React.JSX.Element {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24 mx-auto" aria-hidden="true" fill="none">
      <circle cx="60" cy="60" r="50" className="fill-info-soft" />
      <rect
        x="38"
        y="36"
        width="44"
        height="48"
        rx="8"
        className="stroke-info fill-surface stroke-2"
      />
      <line x1="38" y1="50" x2="82" y2="50" className="stroke-info stroke-2" />
      <circle cx="50" cy="62" r="3" className="fill-info" />
      <circle cx="62" cy="62" r="3" className="fill-info" />
      <circle cx="70" cy="62" r="3" className="fill-info" />
    </svg>
  );
}

export function ScanFrame(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-16 h-16 mx-auto text-primary"
      aria-hidden="true"
      fill="none"
    >
      <path d="M20,35 L20,20 L35,20" className="stroke-current stroke-3" strokeLinecap="round" />
      <path d="M65,20 L80,20 L80,35" className="stroke-current stroke-3" strokeLinecap="round" />
      <path d="M80,65 L80,80 L65,80" className="stroke-current stroke-3" strokeLinecap="round" />
      <path d="M35,80 L20,80 L20,65" className="stroke-current stroke-3" strokeLinecap="round" />
      <rect
        x="32"
        y="32"
        width="36"
        height="36"
        rx="4"
        className="stroke-primary-strong/40 stroke-2 stroke-dashed"
      />
    </svg>
  );
}
