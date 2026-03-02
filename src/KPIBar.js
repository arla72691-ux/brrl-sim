import React, { useState, useEffect, useRef } from "react";
import { C, F } from "./tokens";

// ─── Single KPI tile ──────────────────────────────────────────────────────────
function KPITile({ defKey, def, absValue, delta, isLast, narrow }) {
  const isGood = delta !== 0 && (def.goodDir === 1 ? delta > 0 : delta < 0);
  const dColor = delta === 0 ? C.t4 : isGood ? C.up : C.down;
  const dBg    = delta === 0 ? "transparent" : isGood ? C.upBg : C.downBg;

  // Animate delta badge 0 → |delta|
  const [animDelta, setAnimDelta] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    const to = Math.abs(delta);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (to === 0) { setAnimDelta(0); return; }
    const start = performance.now();
    const tick = now => {
      const t = Math.min((now - start) / 900, 1);
      setAnimDelta((1 - Math.pow(1 - t, 3)) * to);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [delta]);

  const fmtDelta = v => {
    if (defKey === "marginPct") return `${v.toFixed(1)}%`;
    if (defKey === "revenue")   return `₹${Math.round(v)} Cr`;
    return `${Math.round(v)}${def.unit}`;
  };

  // narrow = mobile layout (2-col grid), wide = single row
  const tileStyle = narrow ? {
    // On mobile: 2-per-row except last KPI which is full-width
    flex: "1 1 45%",
    padding: "10px 12px",
    borderRight: "none",
    borderBottom: `1px solid ${C.borderLo}`,
  } : {
    flex: 1,
    padding: "13px 16px",
    borderRight: isLast ? "none" : `1px solid ${C.borderLo}`,
  };

  return (
    <div style={tileStyle}>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.t3, letterSpacing: "0.4px",
        fontFamily: F, marginBottom: 4, textTransform: "uppercase" }}>
        {def.label}
      </div>
      <div style={{ fontSize: narrow ? 17 : 20, fontWeight: 700, color: C.t1,
        fontFamily: F, letterSpacing: "-0.5px", lineHeight: 1 }}>
        {def.fmt(absValue)}
      </div>
      <div style={{ marginTop: 4, minHeight: 18 }}>
        {delta !== 0 ? (
          <span style={{ fontSize: 10, fontWeight: 600, fontFamily: F, color: dColor,
            background: dBg, borderRadius: 4, padding: "2px 5px", display: "inline-block" }}>
            {delta > 0 ? "▲" : "▼"} {fmtDelta(animDelta)}
          </span>
        ) : (
          <span style={{ fontSize: 10, color: C.t4, fontFamily: F }}>—</span>
        )}
      </div>
    </div>
  );
}

// ─── KPI Bar — responsive via ResizeObserver ──────────────────────────────────
export default function KPIBar({ baseline, cumulative, lastDelta, impactNote }) {
  const containerRef = useRef(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setNarrow(entry.contentRect.width < 560);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const keys = Object.keys(baseline);

  return (
    <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}` }} ref={containerRef}>
      <div style={{
        display: "flex",
        flexWrap: narrow ? "wrap" : "nowrap",
        borderBottom: impactNote ? `1px solid ${C.borderLo}` : "none",
      }}>
        {keys.map((key, i) => {
          const def    = baseline[key];
          const cum    = cumulative[key] || 0;
          const delta  = lastDelta ? (lastDelta[key] || 0) : 0;
          const absVal = key === "revenue" ? cum : def.base + cum;
          return (
            <KPITile
              key={key}
              defKey={key}
              def={def}
              absValue={absVal}
              delta={delta}
              isLast={i === keys.length - 1}
              narrow={narrow}
            />
          );
        })}
      </div>
      {impactNote && (
        <div style={{ padding: "9px 16px", background: "#fafafa" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, fontFamily: F }}>
            Decision impact:{" "}
          </span>
          <span style={{ fontSize: 11, color: C.t2, fontFamily: F, lineHeight: 1.6 }}>
            {impactNote}
          </span>
        </div>
      )}
    </div>
  );
}
