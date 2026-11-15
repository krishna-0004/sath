import React from "react";

export function HeroBlob(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 400 400"
      className="w-full h-full text-primary-soft/60"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M320,280Q260,320,200,310Q140,300,90,260Q40,220,60,160Q80,100,140,70Q200,40,260,70Q320,100,350,160Q380,220,320,280Z" />
    </svg>
  );
}
