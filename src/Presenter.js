import React, { useState, useEffect, useCallback, useRef } from "react";
import { C, F, combinedGrade } from "./tokens";
import { getLB, getVotes, clearSession } from "./firebase";

// ─── Scenario metadata for presenter display ──────────────────────────────────
const ALL_SCENARIOS = [
  { id:"1A", part:1, domain:"MANUFACTURING",              domainColor:"#6e3fc4", title:"The Maintenance Model Governance Question" },
  { id:"1B", part:1, domain:"SALES & MARKETING",          domainColor:"#0071e3", title:"The Data Foundation Decision" },
  { id:"1C", part:1, domain:"LOGISTICS",                  domainColor:"#c2410c", title:"The Capacity Triage Problem" },
  { id:"2A", part:2, domain:"DEMAND & SUPPLY INTEGRATION",domainColor:"#6e3fc4", title:"The Blue Yonder Go-Live Decision" },
  { id:"2B", part:2, domain:"INVENTORY & CAPACITY",       domainColor:"#0071e3", title:"The Replenishment Logic Question" },
  { id:"2C", part:2, domain:"CHANGE & SUSTAINMENT",       domainColor:"#1d8348", title:"The Adoption Cliff" },
];

const CORRECT = { "1A":"C", "1B":"A", "1C":"B", "2A":"A", "2B":"C", "2C":"B" };

export default function Presenter() {
  const [view,    setView]    = useState("scenario");
  const [scenIdx, setScenIdx] = useState(0);
  const [lb,      setLb]      = useState([]);
  const [votes,   setVotes]   = useState({});
  const [polled,  setPolled]  = useState(null);
  const [confirm, setConfirm] = useState(false);

  const scen = ALL_SCENARIOS[scenIdx];

  const poll = useCallback(async () => {
    const [board, v] = await Promise.all([getLB(), getVotes()]);
    setLb(board);
    setVotes(v);
    setPolled(new Date());
  }, []);

  useEffect(() => { poll(); const t = setInterval(poll, 3000); return () => clearInterval(t); }, [poll]);

  // Vote counts for current scenario
  const counts = { A: 0, B: 0, C: 0 };
  Object.entries(votes).forEach(([k, o]) => {
    if (k.startsWith(scen.id + "__")) counts[o] = (counts[o] || 0) + 1;
  });
  const voteTotal = counts.A + counts.B + counts.C;
  const maxVote   = Math.max(counts.A, counts.B, counts.C, 1);

  const dc = scen.domainColor;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: F }}>

      {/* ── TOP BAR ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(245,245,247,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 24px", maxWidth: 1200, margin: "0 auto", flexWrap: "wrap", gap: 8 }}>

          {/* Left: branding + scenario pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, letterSpacing: "0.5px", textTransform: "uppercase" }}>Accenture CNR · India</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>BRRL Simulation — Presenter</div>
            </div>
            <div style={{ width: 1, height: 28, background: C.border }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, color: C.t3, textTransform: "uppercase", letterSpacing: "0.4px", marginRight: 2 }}>P1</span>
              {ALL_SCENARIOS.slice(0, 3).map((s, i) => (
                <button key={s.id} onClick={() => { setScenIdx(i); setView("scenario"); }} style={{
                  width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
                  border: `2px solid ${scenIdx === i ? s.domainColor : C.border}`,
                  background: scenIdx === i ? s.domainColor + "18" : C.card,
                  fontSize: 10, fontWeight: 700, color: scenIdx === i ? s.domainColor : C.t3,
                  outline: "none", fontFamily: F,
                }}>{s.id}</button>
              ))}
              <span style={{ fontSize: 9, color: C.t3, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 2px 0 8px" }}>P2</span>
              {ALL_SCENARIOS.slice(3).map((s, i) => (
                <button key={s.id} onClick={() => { setScenIdx(i + 3); setView("scenario"); }} style={{
                  width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
                  border: `2px solid ${scenIdx === i + 3 ? s.domainColor : C.border}`,
                  background: scenIdx === i + 3 ? s.domainColor + "18" : C.card,
                  fontSize: 10, fontWeight: 700, color: scenIdx === i + 3 ? s.domainColor : C.t3,
                  outline: "none", fontFamily: F,
                }}>{s.id}</button>
              ))}
            </div>
          </div>

          {/* Right: view tabs + live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 2, background: C.bg, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
              {[{ key: "scenario", label: "Now Playing" }, { key: "votes", label: `Votes${voteTotal > 0 ? ` (${voteTotal})` : ""}` }, { key: "leaderboard", label: "Leaderboard" }].map(t => (
                <button key={t.key} onClick={() => setView(t.key)} style={{
                  background: view === t.key ? C.card : "transparent",
                  border: view === t.key ? `1px solid ${C.border}` : "1px solid transparent",
                  color: view === t.key ? C.t1 : C.t3,
                  padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", outline: "none", fontFamily: F,
                  boxShadow: view === t.key ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                }}>{t.label}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1d8348", animation: "livePulse 2s infinite" }} />
              <span style={{ fontSize: 11, color: C.t3 }}>{lb.length} players</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* NOW PLAYING */}
        {view === "scenario" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: dc, letterSpacing: "0.5px", border: `1px solid ${dc}33`, borderRadius: 20, padding: "4px 12px", background: dc + "12" }}>{scen.domain}</span>
              <span style={{ fontSize: 12, color: C.t3 }}>Part {scen.part} · Scenario {(scenIdx % 3) + 1} of 3</span>
            </div>
            <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 700, color: C.t1, letterSpacing: "-1.5px", lineHeight: 1.15, margin: "0 0 12px" }}>{scen.title}</h2>
            <div style={{ fontSize: 14, color: C.t3, marginBottom: 28 }}>
              Correct answer: <strong style={{ color: C.up }}>Option {CORRECT[scen.id]}</strong>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>Live vote split</div>
              {["A", "B", "C"].map(opt => {
                const cnt = counts[opt] || 0;
                const pct = voteTotal > 0 ? Math.round((cnt / voteTotal) * 100) : 0;
                const isCorrect = CORRECT[scen.id] === opt;
                return (
                  <div key={opt} style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 28, height: 28, borderRadius: "50%", background: dc + "18", border: `1px solid ${dc}33`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: dc }}>{opt}</span>
                        {isCorrect && <span style={{ fontSize: 11, color: C.up, fontWeight: 600, background: C.upBg, borderRadius: 20, padding: "2px 10px" }}>✓ Best answer</span>}
                      </div>
                      <div>
                        <span style={{ fontSize: 28, fontWeight: 700, color: dc, letterSpacing: "-1px" }}>{pct}%</span>
                        <span style={{ fontSize: 12, color: C.t3, marginLeft: 4 }}>({cnt})</span>
                      </div>
                    </div>
                    <div style={{ height: 12, background: C.bg, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.borderLo}` }}>
                      <div style={{ height: "100%", width: `${(cnt / maxVote) * 100}%`, background: isCorrect ? C.up : dc, borderRadius: 6, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)", opacity: 0.85 }} />
                    </div>
                  </div>
                );
              })}
              {voteTotal === 0 && <div style={{ color: C.t3, fontSize: 13 }}>No votes yet for this scenario.</div>}
            </div>
          </div>
        )}

        {/* VOTES — full breakdown */}
        {view === "votes" && (
          <div>
            <h2 style={{ fontSize: "clamp(22px,3.5vw,36px)", fontWeight: 700, color: C.t1, letterSpacing: "-1px", margin: "0 0 6px" }}>{scen.title}</h2>
            <p style={{ fontSize: 13, color: C.t3, margin: "0 0 28px" }}>{voteTotal} vote{voteTotal !== 1 ? "s" : ""} · updates every 3 seconds</p>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px" }}>
              {["A","B","C"].map(opt => {
                const cnt = counts[opt] || 0;
                const pct = voteTotal > 0 ? Math.round((cnt / voteTotal) * 100) : 0;
                const isCorrect = CORRECT[scen.id] === opt;
                return (
                  <div key={opt} style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 32, height: 32, borderRadius: "50%", background: dc + "18", border: `1px solid ${dc}33`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: dc }}>{opt}</span>
                        {isCorrect && <span style={{ fontSize: 11, color: C.up, fontWeight: 700 }}>✓ Best answer</span>}
                      </div>
                      <div>
                        <span style={{ fontSize: 36, fontWeight: 700, color: dc, letterSpacing: "-1px" }}>{pct}%</span>
                        <span style={{ fontSize: 13, color: C.t3, marginLeft: 6 }}>({cnt})</span>
                      </div>
                    </div>
                    <div style={{ height: 14, background: C.bg, borderRadius: 7, overflow: "hidden", border: `1px solid ${C.borderLo}` }}>
                      <div style={{ height: "100%", width: `${(cnt / maxVote) * 100}%`, background: isCorrect ? C.up : dc, borderRadius: 7, transition: "width 0.9s cubic-bezier(0.16,1,0.3,1)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {view === "leaderboard" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 14 }}>Engagement Complete</div>
              <h1 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 700, color: C.t1, letterSpacing: "-1.5px", margin: "0 0 6px" }}>Final Leaderboard</h1>
              <div style={{ fontSize: 13, color: C.t3 }}>BRRL Full Engagement · {lb.length} player{lb.length !== 1 ? "s" : ""}</div>
            </div>

            {lb.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", padding: "0 20px 10px", borderBottom: `1px solid ${C.borderLo}` }}>
                <div style={{ width: 40 }} />
                <div style={{ flex: 1, marginLeft: 14 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.5px" }}>Player</span>
                </div>
                {[["Part 1", 60], ["Part 2", 60], ["Total", 72]].map(([lbl, w]) => (
                  <div key={lbl} style={{ width: w, textAlign: "right" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{lbl}</span>
                  </div>
                ))}
              </div>
            )}

            {lb.length === 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: 14, color: C.t3 }}>No scores yet. Waiting for players to complete scenarios.</div>
              </div>
            )}

            {lb.slice(0, 20).map((entry, i) => {
              const g = combinedGrade(entry.total || 0);
              const isTop = i < 3;
              return (
                <div key={entry.key} style={{ display: "flex", alignItems: "center", padding: isTop ? "14px 20px" : "10px 20px", borderBottom: `1px solid ${C.borderLo}`, background: i === 0 ? "#fffdf4" : "transparent" }}>
                  <div style={{ width: 40, textAlign: "center", fontSize: i === 0 ? 20 : isTop ? 15 : 12, fontWeight: 700, color: i === 0 ? "#b8860b" : i === 1 ? C.t4 : i === 2 ? "#a0522d" : C.t4 }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </div>
                  <div style={{ flex: 1, marginLeft: 14, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: isTop ? 16 : 14, fontWeight: isTop ? 700 : 600, color: C.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: g.c, background: g.c + "18", border: `1px solid ${g.c}33`, borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>{g.l}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: 60, textAlign: "right" }}>
                      {entry.part1 != null ? <><span style={{ fontSize: isTop ? 20 : 16, fontWeight: 700, color: "#1a6eb5" }}>{entry.part1}</span><span style={{ fontSize: 10, color: C.t4 }}>/30</span></> : <span style={{ color: C.t4 }}>—</span>}
                    </div>
                    <div style={{ width: 60, textAlign: "right" }}>
                      {entry.part2 != null ? <><span style={{ fontSize: isTop ? 20 : 16, fontWeight: 700, color: "#6e3fc4" }}>{entry.part2}</span><span style={{ fontSize: 10, color: C.t4 }}>/30</span></> : <span style={{ color: C.t4 }}>—</span>}
                    </div>
                    <div style={{ width: 72, textAlign: "right" }}>
                      <span style={{ fontSize: isTop ? 28 : 22, fontWeight: 800, color: g.c, letterSpacing: "-0.5px" }}>{entry.total || 0}</span>
                      <span style={{ fontSize: 11, color: C.t4 }}>/60</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Grade key */}
            <div style={{ marginTop: 20, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 18px", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.5px" }}>Grade key</span>
              {[{ l: "A+", label: "Managing Director", c: "#1d8348", min: "54+" }, { l: "A", label: "Senior Manager", c: "#1d8348", min: "46+" }, { l: "B", label: "Manager", c: "#1a6eb5", min: "38+" }, { l: "C", label: "Consultant", c: "#9a5e00", min: "28+" }, { l: "D", label: "Analyst", c: "#c0392b", min: "16+" }, { l: "E", label: "Associate", c: "#c0392b", min: "0+" }].map(g => (
                <div key={g.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: g.c, background: g.c + "18", border: `1px solid ${g.c}33`, borderRadius: 20, padding: "2px 8px" }}>{g.l}</span>
                  <span style={{ fontSize: 11, color: C.t2 }}>{g.label}</span>
                  <span style={{ fontSize: 10, color: C.t4 }}>{g.min}</span>
                </div>
              ))}
            </div>

            {/* Clear session */}
            <div style={{ marginTop: 24, textAlign: "center" }}>
              {!confirm ? (
                <button onClick={() => setConfirm(true)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.t3, padding: "8px 20px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: F }}>
                  Clear all session data
                </button>
              ) : (
                <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: C.t2, fontFamily: F }}>Clear all scores and votes?</span>
                  <button onClick={async () => { await clearSession(); await poll(); setConfirm(false); }}
                    style={{ background: C.down, border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Yes, clear</button>
                  <button onClick={() => setConfirm(false)}
                    style={{ background: C.card, border: `1px solid ${C.border}`, color: C.t2, padding: "8px 18px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: F }}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BAR */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "rgba(245,245,247,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: `1px solid ${C.border}`, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setScenIdx(i => Math.max(0, i - 1))} disabled={scenIdx === 0}
            style={{ background: C.card, border: `1px solid ${C.border}`, color: scenIdx === 0 ? C.t4 : C.t2, padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: scenIdx === 0 ? "default" : "pointer", outline: "none", fontFamily: F }}>← Prev</button>
          <button onClick={() => setScenIdx(i => Math.min(ALL_SCENARIOS.length - 1, i + 1))} disabled={scenIdx === ALL_SCENARIOS.length - 1}
            style={{ background: C.card, border: `1px solid ${C.border}`, color: scenIdx === ALL_SCENARIOS.length - 1 ? C.t4 : C.t2, padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: scenIdx === ALL_SCENARIOS.length - 1 ? "default" : "pointer", outline: "none", fontFamily: F }}>Next →</button>
        </div>
        <div style={{ fontSize: 11, color: C.t3 }}>
          <span style={{ color: dc, fontWeight: 600 }}>{scen.id}</span> · {scen.title}
        </div>
        <div style={{ fontSize: 10, color: C.t4 }}>
          {polled ? `Last updated ${polled.toLocaleTimeString()}` : "Connecting…"}
        </div>
      </div>

      <style>{`
        @keyframes livePulse {
          0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(29,131,72,0.4); }
          50%      { opacity:0.7; box-shadow:0 0 0 5px rgba(29,131,72,0); }
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
