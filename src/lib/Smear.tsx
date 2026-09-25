import React from "react";

export const Smear = ({ id, x = 0, y = 0, children, style }: { id: string; x?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }) => {
  const active = x > 0.3 || y > 0.3;
  return (
    <>
      {active && (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={`${x.toFixed(2)} ${y.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <span style={{ display: "inline-block", filter: active ? `url(#${id})` : undefined, ...style }}>{children}</span>
    </>
  );
};
